import uuid
import io
import logging
import subprocess

import boto3
from flask import request, abort

from .. import api_bp as api
from flask import current_app
from ...decorators import token_required
from ..utils import json_response, InvalidAPIRequest
from PIL import Image


SIZES = {
    # Note that we scale to double of rendered px height to look good
    # on retina.
    'cover-image': (6000, 1000),
    'company-logo': (300, 300),
    'proposal-image': (3000, 1000),
}


# Pillow needs to know the type of the image we're saving as because
# we only have a byte buffer. browse mime type is the most reliable
# source of intent.
EXTENSION_FROM_MIMETYPE = {
        "image/jpg": "JPEG",
        "image/jpeg": "JPEG",
        "image/png": "PNG",
        "image/gif": "GIF",
}


def try_saving_corrupted_image(image_bytes):
    """
    convert is pretty good at fixing random image problems like CRC
    failures, so if the initial load fails we push the data through
    convert hoping that that fixes the problem.
    """
    p = subprocess.Popen(['convert', '/dev/stdin', '/dev/stdout'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    fixed_bytes, _ = p.communicate(image_bytes)
    return fixed_bytes


@api.route("/upload/<string:purpose>", methods=["POST"])
@token_required()
def upload(purpose):
    file = request.files["file"]

    assert sorted(EXTENSION_FROM_MIMETYPE.keys()) == sorted(current_app.config["ALLOWED_UPLOAD_MIMETYPES"])

    purpose_size = SIZES.get(purpose)
    if purpose_size is None:
        raise InvalidAPIRequest(payload={"error": "Unexpected purpose"})

    if file.mimetype not in current_app.config["ALLOWED_UPLOAD_MIMETYPES"]:
        raise InvalidAPIRequest(payload={"file": "Format not accepted"})

    extension = EXTENSION_FROM_MIMETYPE[file.mimetype]
    contents = file.read()
    scaled_contents = io.BytesIO()
    try:
        image = Image.open(io.BytesIO(contents))
    except IOError:
        maybe_fixed_contents = try_saving_corrupted_image(contents)
        try:
            image = Image.open(io.BytesIO(maybe_fixed_contents))
        except:
            raise InvalidAPIRequest(payload={"file": "Format not accepted"})
    except:
        raise InvalidAPIRequest(payload={"file": "Format not accepted"})

    image.thumbnail(purpose_size, Image.ANTIALIAS)

    if extension == "JPEG":
        # default quality is 75 which is too low
        image.save(scaled_contents, extension, quality=90)
    else:
        image.save(scaled_contents, extension)

    # TODO: save original filename somewhere?
    file_uuid = uuid.uuid4()
    filename = "proposals/{}.{}".format(file_uuid, extension)

    # We derive the scaled filename based on the context it's used
    # in. We just expect the scaled image to exist which is reasonable
    # because we control everything. If we need different scaling
    # later we can derive new images from the originals which we
    # store, too.
    scaled_filename = "proposals/{}-{}.{}".format(file_uuid, purpose, extension)

    bucket_name = current_app.config["S3_BUCKET_NAME"]
    s3_client = boto3.client("s3")

    # TODO: scrubs exif data
    def upload_s3(filename_, contents_):
        response = s3_client.put_object(
            Bucket=bucket_name, Key=filename_, Body=contents_, ContentType="image",
            CacheControl='max-age=31536000',  # 1 year
        )
        status_code = response["ResponseMetadata"]["HTTPStatusCode"]
        if status_code != 200:
            logging.error("Could not store %s in %s: status_code: %s", filename, bucket_name, status_code)
            abort(500)

    # Upload both, scaled and original, unless its a GIF
    upload_s3(filename, contents)
    if extension != "GIF":
        upload_s3(scaled_filename, scaled_contents.getvalue())

    original_url = "https://{}.s3.amazonaws.com/{}".format(current_app.config["S3_BUCKET_NAME"], filename)
    scaled_url = "https://{}.s3.amazonaws.com/{}".format(current_app.config["S3_BUCKET_NAME"], scaled_filename)

    if extension == "GIF":
        return json_response({"url": original_url}, 200)
    return json_response({"url": scaled_url}, 200)
