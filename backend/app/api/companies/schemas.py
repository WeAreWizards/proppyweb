import re

from marshmallow import (
    Schema, fields, validates, ValidationError
)

from .fonts import FONTS

SUPPORTED_CURRENCIES = [
    "GBP", "EUR", "USD", "HRK", "CZK", "CHF", "DKK", "NOK", "SEK", "BGN",
    "PLN", "RON", "RUB", "UAH", "IDR", "THB", "TRY", "JPY", "KRW", "ZAR",
    "CNY", "MXN", "ARS", "CLP", "PEN", "SGD", "HKD", "AUD", "CAD", "NZD",
    "BRL", "INR", "AED", "MYR", "ILS",
] + [
    "£", "€", "$", "kn", "kč", "chf", "kr.", "kr", "лв", "zł", "lei", "₽",
    "₴", "rp", "฿", "₺", "¥", "₩", "r", "s/", "r$", "₹", "aed "
]


class CompanySchema(Schema):
    companyName = fields.String(required=True)
    currency = fields.String(required=True)
    logoUrl = fields.String(required=False)

    @validates("currency")
    def validate_currency(self, value):
        if value not in SUPPORTED_CURRENCIES:
            raise ValidationError("Unknown currency")


HEX_REGEX = re.compile("^#[0-9a-f]{6}|#[0-9a-f]{3}$", re.IGNORECASE)


def validate_hexadecimal_colour(val):
    if not HEX_REGEX.match(val):
        raise ValidationError("Invalid hexadecimal value")


class BrandingSchema(Schema):
    fontHeaders = fields.String(required=True)
    fontBody = fields.String(required=True)
    primaryColour = fields.String(required=True, validate=validate_hexadecimal_colour)
    bgColour = fields.String(required=True, validate=validate_hexadecimal_colour)
    textColour = fields.String(required=True, validate=validate_hexadecimal_colour)

    @validates("fontHeaders")
    def validate_headers_font(self, value):
        if value not in FONTS:
            raise ValidationError("Unknown font")

    @validates("fontBody")
    def validate_text_font(self, value):
        if value not in FONTS:
            raise ValidationError("Unknown font")


class BrandingUpdateSchema(Schema):
    branding = fields.Nested(BrandingSchema)
