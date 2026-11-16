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
        "rw": "Ikimina: ikodesi w'kugenzura nimero yawe ingera {code}. Igihe: iminota 5.",
        "en": "Ikimina: your verification code is {code}. It expires in 5 minutes.",
        "fr": "Ikimina: votre code de verification est {code}. Il expire dans 5 minutes.",
    },
    "reset_password": {
        "rw": "Ikimina: ikodesi yo guhindura pasiyo ni {code}. Igihe: iminota 5.",
        "en": "Ikimina: your password reset code is {code}. It expires in 5 minutes.",
        "fr": "Ikimina: votre code de reinitialisation est {code}. Il expire dans 5 minutes.",
    },
    "change_phone": {
        "rw": "Ikimina: ikodesi yo guhindura nimero ni {code}. Igihe: iminota 5.",
        "en": "Ikimina: your code to change the phone number is {code}. It expires in 5 minutes.",
        "fr": "Ikimina: votre code pour changer de numero est {code}. Il expire dans 5 minutes.",
    },
    "login_2fa": {
        "rw": "Ikimina: ikodesi yo kwinjira ni {code}. Igihe: iminota 5.",
        "en": "Ikimina: your sign-in code is {code}. It expires in 5 minutes.",
        "fr": "Ikimina: votre code de connexion est {code}. Il expire dans 5 minutes.",
    },
    "contribution_recorded": {
        "rw": "Ikimina: ibigombwa bwa {amount} RWF byabandikiwe. Urakoze kubara.",
        "en": "Ikimina: your contribution of {amount} RWF has been recorded. Thank you.",
        "fr": "Ikimina: votre cotisation de {amount} RWF a ete enregistree. Merci.",
    },
    "loan_approved": {
        "rw": "Ikimina: ingomba y'amafaranga {amount} RWF yemerewe.",
        "en": "Ikimina: your loan of {amount} RWF has been approved.",
        "fr": "Ikimina: votre pret de {amount} RWF a ete approuve.",
    },
    "loan_rejected": {
        "rw": "Ikimina: ingomba y'amafaranga {amount} RWF yasubizwe.",
        "en": "Ikimina: your loan request of {amount} RWF was declined.",
        "fr": "Ikimina: votre demande de pret de {amount} RWF a ete refusee.",
    },
    "loan_due_reminder": {
        "rw": "Ikimina: umusanzu wa {amount} RWF ukuze ku {due_date} ntarasobanutse.",
        "en": "Ikimina: a payment of {amount} RWF is due on {due_date}.",
        "fr": "Ikimina: un versement de {amount} RWF est du le {due_date}.",
    },
    "group_invitation": {
        "rw": "Ikimina: wamwirijwe mu mukoperative {group}. Funga ikiganza kwinjira.",
        "en": "Ikimina: you have been added to the savings group {group}.",
        "fr": "Ikimina: vous avez ete ajoute au groupe d'epargne {group}.",
    },
    "email_verification": {
        "en": "Confirm your email address for Ikimina: {link}",
        "fr": "Confirmez votre adresse email pour Ikimina: {link}",
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
