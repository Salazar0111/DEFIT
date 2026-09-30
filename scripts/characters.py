"""Personajes provisionales de DEFIT: cuerpos, caras y expresiones.

Lo usan scripts/avatars.py (avatares y sus ánimos) y scripts/icon-group.py (ícono).
Cada personaje se dibuja en una caja de 120×120 con centro en (60, 60).
"""

INK = "#1a1414"

# id del avatar → nombre del personaje
IDS = {"a1": "aguacate", "a2": "dona", "a3": "brocoli", "a4": "huevo",
       "a5": "fresa", "a6": "taco", "a7": "gota", "a8": "mancuerna"}

MOODS = ["happy", "sleepy", "worried", "party", "surprised"]


def grad(i, a, b):
    return (f'<linearGradient id="{i}" x1="0" y1="0" x2="0" y2="1">'
            f'<stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient>')


# ─── Piezas de cara ────────────────────────────────────────────────────────

def eyes(kind, y, dx, ink=INK, cx=60):
    L, R = cx - dx, cx + dx
    arc = lambda x, d: f'<path d="M{x-5} {y+d[0]} q5 {d[1]} 10 0" stroke="{ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    if kind == "normal":
        return (f'<ellipse cx="{L}" cy="{y}" rx="4.2" ry="5.2" fill="{ink}"/><ellipse cx="{R}" cy="{y}" rx="4.2" ry="5.2" fill="{ink}"/>'
                f'<circle cx="{L+1.4}" cy="{y-1.8}" r="1.5" fill="#fff"/><circle cx="{R+1.4}" cy="{y-1.8}" r="1.5" fill="#fff"/>')
    if kind == "happy":   # ^ ^
        return arc(L, (2, -7)) + arc(R, (2, -7))
    if kind == "closed":  # dormido
        return arc(L, (0, 5)) + arc(R, (0, 5))
    if kind == "wink":
        return (f'<ellipse cx="{L}" cy="{y}" rx="4.2" ry="5.2" fill="{ink}"/><circle cx="{L+1.4}" cy="{y-1.8}" r="1.5" fill="#fff"/>'
                + arc(R, (1, -6)))
    if kind == "wide":
        return (f'<circle cx="{L}" cy="{y}" r="6.5" fill="#fff"/><circle cx="{R}" cy="{y}" r="6.5" fill="#fff"/>'
                f'<circle cx="{L+1}" cy="{y+1}" r="3.6" fill="{INK}"/><circle cx="{R-1}" cy="{y+1}" r="3.6" fill="{INK}"/>')
    if kind == "shades":
        return (f'<rect x="{L-9}" y="{y-6}" width="17" height="11" rx="5" fill="#141214"/><rect x="{R-8}" y="{y-6}" width="17" height="11" rx="5" fill="#141214"/>'
                f'<path d="M{L+8} {y-2} h{R-L-16}" stroke="#141214" stroke-width="2.4"/>'
                f'<path d="M{L-6} {y-3} l5 0" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round"/>'
                f'<path d="M{R-5} {y-3} l5 0" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round"/>')
    if kind == "worried":  # ojos con cejas preocupadas
        return (eyes("normal", y, dx, ink, cx)
                + f'<path d="M{L-6} {y-9} l9 -3" stroke="{ink}" stroke-width="2.4" stroke-linecap="round"/>'
                + f'<path d="M{R+6} {y-9} l-9 -3" stroke="{ink}" stroke-width="2.4" stroke-linecap="round"/>')
    if kind == "angry":
        return (eyes("normal", y, dx, ink, cx)
                + f'<path d="M{L-8} {y-8} l12 4 M{R+8} {y-8} l-12 4" stroke="{ink}" stroke-width="2.6" stroke-linecap="round"/>')


def mouth(kind, y, ink=INK, cx=60):
    if kind == "smile":
        return f'<path d="M{cx-7} {y} q7 7 14 0" stroke="{ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    if kind == "grin":
        teeth = "#fff" if ink == INK else INK
        return f'<path d="M{cx-10} {y-1} q10 12 20 0 z" fill="{ink}"/><path d="M{cx-8} {y} h16" stroke="{teeth}" stroke-width="2.4"/>'
    if kind == "tongue":
        return f'<path d="M{cx-8} {y} q8 8 16 0 z" fill="{ink}"/><path d="M{cx-3} {y+3} q3 6 6 0" fill="#ff6f8e"/>'
    if kind == "o":
        return f'<ellipse cx="{cx}" cy="{y+2}" rx="4" ry="5" fill="{ink}"/>'
    if kind == "smug":
        return f'<path d="M{cx-6} {y+1} q8 4 13 -3" stroke="{ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    if kind == "flat":
        return f'<path d="M{cx-4} {y+1} h8" stroke="{ink}" stroke-width="2.6" stroke-linecap="round"/>'
    if kind == "wavy":
        return f'<path d="M{cx-9} {y+2} q3 -4 6 0 q3 4 6 0 q3 -4 6 0" stroke="{ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
    if kind == "frown":
        return f'<path d="M{cx-7} {y+4} q7 -7 14 0" stroke="{ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>'


def cheeks(y, dx):
    return (f'<ellipse cx="{60-dx}" cy="{y}" rx="5" ry="3" fill="#ff7a93" fill-opacity=".5"/>'
            f'<ellipse cx="{60+dx}" cy="{y}" rx="5" ry="3" fill="#ff7a93" fill-opacity=".5"/>')


# Adornos de cada ánimo, fuera de la cara.
def zz():
    return ('<text x="86" y="36" font-family="Helvetica" font-weight="700" font-size="15" fill="#1a1414" fill-opacity=".55">z</text>'
            '<text x="96" y="25" font-family="Helvetica" font-weight="700" font-size="11" fill="#1a1414" fill-opacity=".4">z</text>')


def sweat(x=88, y=40):
    return (f'<path d="M{x} {y} c-4 6 -5 9 -5 11 a5 5 0 0 0 10 0 c0 -2 -1 -5 -5 -11z" fill="#7cc8ff" stroke="#fff" stroke-width="1.2"/>')


def sparkles():
    star = lambda x, y, r, c: (f'<path d="M{x} {y-r} Q{x} {y} {x+r} {y} Q{x} {y} {x} {y+r} Q{x} {y} {x-r} {y} Q{x} {y} {x} {y-r}Z" fill="{c}"/>')
    return star(18, 30, 7, "#ffd84d") + star(102, 22, 6, "#ffffff") + star(104, 64, 5, "#ffd84d") + star(14, 70, 4, "#ffffff")


# ─── Personajes ────────────────────────────────────────────────────────────
# face: posición de ojos (y, dx), boca (y), mejillas (y, dx), tinta y cara base.

CHARS = {
    "aguacate": dict(
        bg=("#e9f7d9", "#a9d98a"), defs=lambda p: grad(f"{p}s", "#5f9e3a", "#3d7a25"),
        body=lambda p: (f'<path d="M60 18 C82 18 90 48 90 70 C90 90 77 102 60 102 C43 102 30 90 30 70 C30 48 38 18 60 18Z" fill="url(#{p}s)"/>'
                        '<path d="M60 26 C77 26 83 50 83 70 C83 86 73 95 60 95 C47 95 37 86 37 70 C37 50 43 26 60 26Z" fill="#d9f0a3"/>'
                        '<circle cx="60" cy="80" r="11" fill="#9a6b3f"/><circle cx="56" cy="76" r="3" fill="#fff" fill-opacity=".35"/>'),
        eye=(55, 13), mouth_y=64, cheek=(62, 18), base=("normal", "smile")),
    "dona": dict(
        bg=("#ffe7ef", "#ffb7cb"), defs=lambda p: grad(f"{p}s", "#f2c48d", "#d99a5b"),
        body=lambda p: (f'<circle cx="60" cy="64" r="36" fill="url(#{p}s)"/>'
                        '<path d="M26 58 C30 36 90 36 94 58 C96 70 88 66 82 70 C76 74 70 66 62 70 C54 74 48 66 40 70 C32 74 24 68 26 58Z" fill="#ff6f9f"/>'
                        '<circle cx="60" cy="64" r="9" fill="#e9b27a"/>'
                        '<g stroke-width="3" stroke-linecap="round"><path d="M40 48 l4 -2" stroke="#fff"/><path d="M70 44 l4 2" stroke="#ffe066"/>'
                        '<path d="M52 40 l3 -3" stroke="#7fd1ff"/><path d="M82 54 l2 3" stroke="#fff"/></g>'),
        eye=(80, 14), mouth_y=88, cheek=(86, 26), base=("wink", "tongue")),
    "brocoli": dict(
        bg=("#e3f6e8", "#9fd8b0"), defs=lambda p: grad(f"{p}s", "#3f9a4f", "#2a7a3a"),
        body=lambda p: ('<rect x="50" y="62" width="20" height="36" rx="8" fill="#9ccf6e"/>'
                        f'<circle cx="40" cy="48" r="18" fill="url(#{p}s)"/><circle cx="80" cy="48" r="18" fill="url(#{p}s)"/>'
                        f'<circle cx="60" cy="36" r="20" fill="url(#{p}s)"/><circle cx="60" cy="58" r="20" fill="url(#{p}s)"/>'),
        eye=(52, 12), mouth_y=64, cheek=(62, 20), base=("shades", "smug"), no_cheeks=True),
    "huevo": dict(
        bg=("#fff6dc", "#ffe29a"), defs=lambda p: "",
        body=lambda p: ('<path d="M60 20 C84 20 94 52 94 72 C94 92 80 102 60 102 C40 102 26 92 26 72 C26 52 36 20 60 20Z" fill="#fffdf7"/>'
                        '<path d="M60 20 C84 20 94 52 94 72 C94 92 80 102 60 102" fill="none" stroke="#e8dcc0" stroke-width="3"/>'),
        eye=(62, 13), mouth_y=75, cheek=(74, 24), base=("wide", "o")),
    "fresa": dict(
        bg=("#ffe5e5", "#ffadad"), defs=lambda p: grad(f"{p}s", "#ff5a6b", "#d7263d"),
        body=lambda p: (f'<path d="M60 102 C36 88 24 66 28 50 C32 34 48 32 60 38 C72 32 88 34 92 50 C96 66 84 88 60 102Z" fill="url(#{p}s)"/>'
                        '<path d="M44 30 C50 22 56 28 60 34 C64 28 70 22 76 30 C70 34 64 36 60 38 C56 36 50 34 44 30Z" fill="#43a047"/>'
                        '<g fill="#ffe082"><ellipse cx="42" cy="56" rx="1.6" ry="2.4"/><ellipse cx="78" cy="56" rx="1.6" ry="2.4"/>'
                        '<ellipse cx="46" cy="80" rx="1.6" ry="2.4"/><ellipse cx="74" cy="80" rx="1.6" ry="2.4"/><ellipse cx="60" cy="90" rx="1.6" ry="2.4"/></g>'),
        eye=(60, 12), mouth_y=72, cheek=(70, 20), base=("happy", "grin")),
    "taco": dict(
        bg=("#fff1d6", "#ffd08a"), defs=lambda p: grad(f"{p}s", "#f5c16c", "#e09a3c"),
        body=lambda p: ('<path d="M26 82 C28 60 40 46 44 50 C48 40 56 44 60 42 C64 44 72 40 76 50 C80 46 92 60 94 82Z" fill="#7cc55a"/>'
                        '<g fill="#e53935"><circle cx="44" cy="56" r="5"/><circle cx="74" cy="54" r="5"/></g>'
                        f'<path d="M20 86 C20 64 38 50 60 50 C82 50 100 64 100 86Z" fill="url(#{p}s)"/>'),
        eye=(68, 14), mouth_y=77, cheek=(76, 24), base=("normal", "tongue")),
    "gota": dict(
        bg=("#e3f2ff", "#9fd0ff"), defs=lambda p: grad(f"{p}s", "#6ec1ff", "#2b8de0"),
        body=lambda p: (f'<path d="M60 16 C60 16 90 52 90 72 C90 90 76 102 60 102 C44 102 30 90 30 72 C30 52 60 16 60 16Z" fill="url(#{p}s)"/>'
                        '<path d="M44 66 C44 56 50 48 52 46" stroke="#fff" stroke-opacity=".7" stroke-width="4" stroke-linecap="round" fill="none"/>'),
        eye=(70, 13), mouth_y=80, cheek=(80, 20), base=("closed", "flat"), base_extra=zz),
    "mancuerna": dict(
        bg=("#ececf2", "#bcbccb"), defs=lambda p: grad(f"{p}s", "#5b6272", "#343945"),
        body=lambda p: (f'<rect x="16" y="40" width="16" height="44" rx="6" fill="url(#{p}s)"/><rect x="88" y="40" width="16" height="44" rx="6" fill="url(#{p}s)"/>'
                        f'<rect x="30" y="50" width="60" height="24" rx="8" fill="#9aa0ad"/><rect x="36" y="36" width="48" height="52" rx="16" fill="url(#{p}s)"/>'),
        eye=(58, 10), mouth_y=72, cheek=(68, 16), ink="#ffffff", base=("angry", "frown")),
}

# Cara de cada ánimo: (ojos, boca, adorno, mejillas)
MOOD_FACE = {
    "happy": ("normal", "smile", None, True),
    "sleepy": ("closed", "flat", zz, False),
    "worried": ("worried", "wavy", sweat, False),
    "party": ("happy", "grin", sparkles, True),
    "surprised": ("wide", "o", None, True),
}


def face(name, mood=None):
    c = CHARS[name]
    ink = c.get("ink", INK)
    ey, edx = c["eye"]
    if mood is None:
        e, m = c["base"]
        extra, show_cheeks = c.get("base_extra"), not c.get("no_cheeks")
    else:
        e, m, extra, show_cheeks = MOOD_FACE[mood]
        # El brócoli conserva sus gafas cuando está contento o celebrando.
        if name == "brocoli" and mood in ("happy", "party"):
            e = "shades"
    out = eyes(e, ey, edx, ink) + mouth(m, c["mouth_y"], ink)
    if show_cheeks and not c.get("no_cheeks"):
        out += cheeks(*c["cheek"])
    if extra:
        out += extra()
    return out


def figure(name, mood=None, prefix="c"):
    """Personaje sin fondo: (defs, cuerpo + cara)."""
    c = CHARS[name]
    return c["defs"](prefix), c["body"](prefix) + face(name, mood)


def avatar_svg(name, mood=None):
    """Avatar completo: círculo de fondo, sombra, personaje y brillo."""
    c = CHARS[name]
    defs, fig = figure(name, mood, "")
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
<defs><radialGradient id="bg" cx="35%" cy="25%" r="85%"><stop offset="0" stop-color="{c["bg"][0]}"/><stop offset="1" stop-color="{c["bg"][1]}"/></radialGradient>{defs}</defs>
<circle cx="60" cy="60" r="60" fill="url(#bg)"/>
<ellipse cx="60" cy="104" rx="30" ry="5" fill="#000" fill-opacity=".12"/>
{fig}
<ellipse cx="42" cy="22" rx="26" ry="12" fill="#fff" fill-opacity=".14" transform="rotate(-20 42 22)"/>
</svg>
'''
