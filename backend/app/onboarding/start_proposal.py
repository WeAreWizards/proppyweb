from app.models.proposals import Proposal
from app.models.blocks import Block
from app.setup import db
from app.utils.tokens import get_random_string


def create_welcome_proposal(company_id):
    """
    We generate a proposal on sign up to guide new users
    """
    proposal = Proposal(
        title="Start here!",
        company_id=company_id,
        share_uid=get_random_string(),
        tags=["onboarding"],
        cover_image_url="",
    )

    db.session.add(proposal)
    db.session.commit()

    # in "manage.py shell":
    # p = Proposal.query.get(ID TO FETCH)
    # [dict(type=x.to_json()['type'], data=x.to_json()['data'])  for x in p.blocks.order_by(Block.ordering)]
    # paste here:
    blocks = [{'data': {'value': 'Welcome'}, 'type': 'section'},
         {'data': {'value': 'How are you?'}, 'type': 'paragraph'},
         {'data': {'value': 'We are glad that you have decided to give Proppy a try!'},
          'type': 'paragraph'},
         {'data': {'value': 'To make sure you get the most out of it, we are going to explain how it works in this document.'},
          'type': 'paragraph'},
         {'data': {'value': 'How does Proppy work?'}, 'type': 'section'},
         {'data': {'value': 'A proposal in Proppy is made of <b>blocks </b> and content. Want to see the available blocks right now? Click on the three dots in the paragraph below and click on the green plus that appears on the left and add a block of type&nbsp;<i>Heading 2</i>.'},
          'type': 'paragraph'},
         {'data': {'value': ''}, 'type': 'paragraph'},
         {'data': {'value': "Now, that required you to use your mouse. Let's go one step further. "},
          'type': 'paragraph'},
         {'data': {'value': 'Click on the three dots below again but this time type a <b>/</b> (slash) and you will see the block changer (our name for that component) appearing again. Type <b>list</b>&nbsp;and it will filter down to <i>Unordered List</i> and <i>Ordered List</i> as you type. Select one of them - use arrow up and down to move around - and press Enter to add it.'},
          'type': 'paragraph'},
         {'data': {'value': ''}, 'type': 'paragraph'},
         {'data': {'value': 'Easy, isn\'t it? You now know how to change an empty block type, what about if you already had some text and want to change its type? Try selecting some of the text in that paragraph or just CTRL+A while in it and click "H2" in the black toolbar appearing above to transform this paragraph into a heading 2.'},
          'type': 'paragraph'},
         {'data': {'value': 'If you select the text again you\'ll see that "H2" is highlighted. Click it again to transform back to normal text.'},
          'type': 'paragraph'},
         {'data': {'value': 'Creating lists and new section headers works the same way. Give it a try and change this paragraph into a bullet point!'},
          'type': 'paragraph'},
         {'data': {'value': 'But Proppy is not only about text! Our goal is to give you the tools to write amazing interactive proposals easily so we have specialized blocks. Blocks can be created with the green plus that appears next to empty paragraphs.'},
          'type': 'paragraph'},
         {'data': {'value': 'For example, something absolutely necessary in a proposal is a cost table. Try creating one by clicking in the empty block below and typing <b>/cost</b>. &nbsp;Typing <b>/table</b> will also work.'},
          'type': 'paragraph'},
         {'data': {'value': ''}, 'type': 'paragraph'},
         {'data': {'value': 'If you play with the table, you can see that the totals are calculated automatically, helping you avoid mistakes. The currency is also set automatically according to your company settings. Change it in the settings if you are not using £, our default.'},
          'type': 'paragraph'},
         {'data': {'value': 'You can also add images to your proposal, and not only static ones. Due to being a web tool, you can even use GIFs if you want.'},
          'type': 'paragraph'},
         {'data': {'value': 'Try adding an image in the block below!'},
          'type': 'paragraph'},
         {'data': {'value': ''}, 'type': 'paragraph'},
         {'data': {'value': 'Congrats!'}, 'type': 'paragraph'},
         {'data': {'value': 'Organising proposals'}, 'type': 'section'},
         {'data': {'value': 'Lots of proposal writing is repeating parts of a proposal written previously. Proppy got you covered for that usecase.'},
          'type': 'paragraph'},
         {'data': {'value': "Anything between two H1 headers counts as a section. We store sections in a searchable format so you can import them later. If you try it right now using the block below, you will see that you can't find anything. It's because the current proposal is excluded from the search. You might be wondering how to move stuff around then."},
          'type': 'paragraph'},
         {'data': {'value': 'Glad you asked!'}, 'type': 'paragraph'},
         {'data': {'value': 'If you hover a H1, H2 or any content block such as the cost table and the image you added above, you will see buttons appearing on the left side.'},
          'type': 'paragraph'},
         {'data': {'value': "The first one on the right deletes the block and, in the case of sections and subsections, its content as well. Don't be afraid to press it, a notification will pop-up and allow you to undo if that was a mistake."},
          'type': 'paragraph'},
         {'data': {'value': 'The two other buttons are there to move blocks in the proposal itself.'},
          'type': 'paragraph'},
         {'data': {'value': 'Other features'}, 'type': 'section'},
         {'data': {'value': 'E-signature'}, 'type': 'subtitle'},
         {'data': {'value': 'Try adding a e-signature block below.'},
          'type': 'paragraph'},
         {'data': {'value': ''}, 'type': 'paragraph'},
         {'data': {'value': "That's it, adding e-signature to your proposal is that simple. Since it is a normal block, you can move it wherever you want in your proposal as well."},
          'type': 'paragraph'},
         {'data': {'value': 'Tags and clients'}, 'type': 'subtitle'},
         {'data': {'value': 'You can add as many tags as you want to a proposal but clients are limited to one (or none) per proposal.'},
          'type': 'paragraph'},
         {'data': {'value': 'Scroll to the top of the page to add and remove tags.'},
          'type': 'paragraph'},
         {'data': {'value': 'Cover image'}, 'type': 'subtitle'},
         {'data': {'value': 'To add a glossy touch you can upload a cover image that will be displayed at the top of the proposal.'},
          'type': 'paragraph'},
         {'data': {'value': 'Comments'}, 'type': 'subtitle'},
         {'data': {'value': 'Clients will be able to comment on each individual block in the published proposal. No more annotated PDFs back and forth.'},
          'type': 'paragraph'},
         {'data': {'value': 'Ready to publish?'}, 'type': 'section'},
         {'data': {'value': 'You wrote your proposal and want your client to see it?'},
          'type': 'paragraph'},
         {'data': {'value': 'Rather than sending a PDF and losing all the interactivity of your proposals (for example your showreel as a Youtube video), send a URL to your client so they can look at your proposal the way you envisioned it.'},
          'type': 'paragraph'},
         {'data': {'value': 'At the top of the page, there is a green <b>Preview</b> button that will open a new tab showing you how your proposal will look. Follow the page instructions to publish your proposal and send your clients an email.'},
          'type': 'paragraph'},
         {'data': {'value': 'We will also move the proposal status to <b>Sent </b>so you always know where you are.'},
          'type': 'paragraph'},
         {'data': {'value': '<b>Enjoy!</b>'}, 'type': 'paragraph'}]


    for i, block in enumerate(blocks):
        proposal.blocks.append(
            Block(
                block["type"],
                proposal_id=proposal.id,
                data=block["data"],
                ordering=i
            )
        )

    db.session.add(proposal)
