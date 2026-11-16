"""Message templates.

Templates are stored by name in the outbox with their parameters, and the
worker renders them at delivery time. Keeping the text here rather than in
the request path means a wording change does not require touching business
logic, and the rendered message is always reproducible from the stored
payload.
"""

from __future__ import annotations

from typing import Any

#: Templates are rendered with ``str.format``-style placeholders.
TEMPLATES: dict[str, dict[str, str]] = {
    "verify_phone": {
        "rw": "Itsinda: ikodesi w'kugenzura nimero yawe ingera {code}. Igihe: iminota 5.",
        "en": "Itsinda: your verification code is {code}. It expires in 5 minutes.",
        "fr": "Itsinda: votre code de verification est {code}. Il expire dans 5 minutes.",
    },
    "reset_password": {
        "rw": "Itsinda: ikodesi yo guhindura pasiyo ni {code}. Igihe: iminota 5.",
        "en": "Itsinda: your password reset code is {code}. It expires in 5 minutes.",
        "fr": "Itsinda: votre code de reinitialisation est {code}. Il expire dans 5 minutes.",
    },
    "change_phone": {
        "rw": "Itsinda: ikodesi yo guhindura nimero ni {code}. Igihe: iminota 5.",
        "en": "Itsinda: your code to change the phone number is {code}. It expires in 5 minutes.",
        "fr": "Itsinda: votre code pour changer de numero est {code}. Il expire dans 5 minutes.",
    },
    "login_2fa": {
        "rw": "Itsinda: ikodesi yo kwinjira ni {code}. Igihe: iminota 5.",
        "en": "Itsinda: your sign-in code is {code}. It expires in 5 minutes.",
        "fr": "Itsinda: votre code de connexion est {code}. Il expire dans 5 minutes.",
    },
    "contribution_recorded": {
        "rw": "Itsinda: ibigombwa bwa {amount} RWF byabandikiwe. Urakoze kubara.",
        "en": "Itsinda: your contribution of {amount} RWF has been recorded. Thank you.",
        "fr": "Itsinda: votre cotisation de {amount} RWF a ete enregistree. Merci.",
    },
    "loan_approved": {
        "rw": "Itsinda: ingomba y'amafaranga {amount} RWF yemerewe.",
        "en": "Itsinda: your loan of {amount} RWF has been approved.",
        "fr": "Itsinda: votre pret de {amount} RWF a ete approuve.",
    },
    "loan_rejected": {
        "rw": "Itsinda: ingomba y'amafaranga {amount} RWF yasubizwe.",
        "en": "Itsinda: your loan request of {amount} RWF was declined.",
        "fr": "Itsinda: votre demande de pret de {amount} RWF a ete refusee.",
    },
    "loan_due_reminder": {
        "rw": "Itsinda: umusanzu wa {amount} RWF ukuze ku {due_date} ntarasobanutse.",
        "en": "Itsinda: a payment of {amount} RWF is due on {due_date}.",
        "fr": "Itsinda: un versement de {amount} RWF est du le {due_date}.",
    },
    "group_invitation": {
        "rw": "Itsinda: wamwirijwe mu mukoperative {group}. Funga ikiganza kwinjira.",
        "en": "Itsinda: you have been added to the savings group {group}.",
        "fr": "Itsinda: vous avez ete ajoute au groupe d'epargne {group}.",
    },
    "email_verification": {
        "rw": "Emeza aderesi yawe ya email kuri Itsinda: {link}",
        "en": "Confirm your email address for Itsinda: {link}",
        "fr": "Confirmez votre adresse email pour Itsinda: {link}",
    },
    "contribution_payment_received": {
        "rw": "Itsinda: igikorwa cyawe cya {amount} RWF cyakiriwe. Urakoze.",
        "en": "Itsinda: your payment of {amount} RWF has been received. Thank you.",
        "fr": "Itsinda: votre paiement de {amount} RWF a été reçu. Merci.",
    },
    "loan_disbursed": {
        "rw": "Itsinda: ingomba yawe y'amafaranga {amount} RWF yatangajwe. Murakoze.",
        "en": "Itsinda: your loan of {amount} RWF has been disbursed. Thank you.",
        "fr": "Itsinda: votre prêt de {amount} RWF a été décaissé. Merci.",
    },
    "repayment_received": {
        "rw": "Itsinda: umusanzu w'amafaranga {amount} RWF wakiriwe. Urakoze.",
        "en": "Itsinda: your repayment of {amount} RWF has been received. Thank you.",
        "fr": "Itsinda: votre remboursement de {amount} RWF a été reçu. Merci.",
    },
    "member_joined": {
        "rw": "Itsinda: {name} yinjiye mu mukoperative {group}.",
        "en": "Itsinda: {name} has joined the savings group {group}.",
        "fr": "Itsinda: {name} a rejoint le groupe d'épargne {group}.",
    },
    "member_left": {
        "rw": "Itsinda: {name} arasohotse mu mukoperative {group}.",
        "en": "Itsinda: {name} has left the savings group {group}.",
        "fr": "Itsinda: {name} a quitté le groupe d'épargne {group}.",
    },
}


def render(template_name: str, language: str, payload: dict[str, Any]) -> str:
    """Render a template, falling back to English then to the raw template."""
    variants = TEMPLATES.get(template_name)
    if not variants:
        return f"[{template_name}] {payload}"
    text = variants.get(language) or variants.get("en") or next(iter(variants.values()))
    try:
        return text.format(**payload)
    except KeyError:
        # A missing parameter should never crash the worker.
        return text
