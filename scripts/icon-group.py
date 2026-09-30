"""Genera public/icon.svg: los 8 personajes juntos y sonriendo.
Uso: python3 scripts/icon-group.py  (luego se exportan los PNG con qlmanage/sips)."""

INK = "#1a1414"

def eyes(kind, p, cx=60, y=62, dx=13):
    L, R = cx - dx, cx + dx
    if kind == "normal":
        return (f'<ellipse cx="{L}" cy="{y}" rx="4.2" ry="5.2" fill="{INK}"/><ellipse cx="{R}" cy="{y}" rx="4.2" ry="5.2" fill="{INK}"/>'
                f'<circle cx="{L+1.4}" cy="{y-1.8}" r="1.5" fill="#fff"/><circle cx="{R+1.4}" cy="{y-1.8}" r="1.5" fill="#fff"/>')
    if kind == "happy":
        return (f'<path d="M{L-5} {y+2} q5 -7 10 0" stroke="{INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
                f'<path d="M{R-5} {y+2} q5 -7 10 0" stroke="{INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>')
    if kind == "wink":
        return (f'<ellipse cx="{L}" cy="{y}" rx="4.2" ry="5.2" fill="{INK}"/><circle cx="{L+1.4}" cy="{y-1.8}" r="1.5" fill="#fff"/>'
                f'<path d="M{R-5} {y+1} q5 -6 10 0" stroke="{INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>')
    if kind == "shades":
        return (f'<rect x="{L-9}" y="{y-6}" width="17" height="11" rx="5" fill="#141214"/><rect x="{R-8}" y="{y-6}" width="17" height="11" rx="5" fill="#141214"/>'
                f'<path d="M{L+8} {y-2} h{R-L-16}" stroke="#141214" stroke-width="2.4"/>'
                f'<path d="M{L-6} {y-3} l5 0" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round"/>'
                f'<path d="M{R-5} {y-3} l5 0" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round"/>')

def mouth(kind, cx=60, y=76):
    if kind == "smile":
        return f'<path d="M{cx-7} {y} q7 7 14 0" stroke="{INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    if kind == "grin":
        return f'<path d="M{cx-10} {y-1} q10 12 20 0 z" fill="{INK}"/><path d="M{cx-8} {y} h16" stroke="#fff" stroke-width="2.4"/>'
    if kind == "tongue":
        return f'<path d="M{cx-8} {y} q8 8 16 0 z" fill="{INK}"/><path d="M{cx-3} {y+3} q3 6 6 0" fill="#ff6f8e"/>'

def cheeks(y=72, dx=22):
    return (f'<ellipse cx="{60-dx}" cy="{y}" rx="5" ry="3" fill="#ff7a93" fill-opacity=".5"/>'
            f'<ellipse cx="{60+dx}" cy="{y}" rx="5" ry="3" fill="#ff7a93" fill-opacity=".5"/>')

def grad(i, a, b):
    return f'<linearGradient id="{i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient>'

# Cada personaje: (defs, cuerpo, cara), en su caja original de 120×120.
def characters():
    c = {}
    c["aguacate"] = (grad("g1", "#5f9e3a", "#3d7a25"),
        '<path d="M60 18 C82 18 90 48 90 70 C90 90 77 102 60 102 C43 102 30 90 30 70 C30 48 38 18 60 18Z" fill="url(#g1)"/>'
        '<path d="M60 26 C77 26 83 50 83 70 C83 86 73 95 60 95 C47 95 37 86 37 70 C37 50 43 26 60 26Z" fill="#d9f0a3"/>'
        '<circle cx="60" cy="80" r="11" fill="#9a6b3f"/><circle cx="56" cy="76" r="3" fill="#fff" fill-opacity=".35"/>',
        eyes("happy", 0, y=55) + mouth("grin", y=63) + cheeks(62, 18))
    c["dona"] = (grad("g2", "#f2c48d", "#d99a5b"),
        '<circle cx="60" cy="64" r="36" fill="url(#g2)"/>'
        '<path d="M26 58 C30 36 90 36 94 58 C96 70 88 66 82 70 C76 74 70 66 62 70 C54 74 48 66 40 70 C32 74 24 68 26 58Z" fill="#ff6f9f"/>'
        '<circle cx="60" cy="64" r="9" fill="#e9b27a"/>'
        '<g stroke-width="3" stroke-linecap="round"><path d="M40 48 l4 -2" stroke="#fff"/><path d="M70 44 l4 2" stroke="#ffe066"/><path d="M52 40 l3 -3" stroke="#7fd1ff"/><path d="M82 54 l2 3" stroke="#fff"/></g>',
        eyes("wink", 0, y=80, dx=14) + mouth("tongue", y=88) + cheeks(86, 26))
    c["brocoli"] = (grad("g3", "#3f9a4f", "#2a7a3a"),
        '<rect x="50" y="62" width="20" height="36" rx="8" fill="#9ccf6e"/>'
        '<circle cx="40" cy="48" r="18" fill="url(#g3)"/><circle cx="80" cy="48" r="18" fill="url(#g3)"/>'
        '<circle cx="60" cy="36" r="20" fill="url(#g3)"/><circle cx="60" cy="58" r="20" fill="url(#g3)"/>',
        eyes("shades", 0, y=52, dx=12) + mouth("grin", y=64))
    c["huevo"] = ("",
        '<path d="M60 20 C84 20 94 52 94 72 C94 92 80 102 60 102 C40 102 26 92 26 72 C26 52 36 20 60 20Z" fill="#fffdf7"/>'
        '<path d="M60 20 C84 20 94 52 94 72 C94 92 80 102 60 102" fill="none" stroke="#e8dcc0" stroke-width="3"/>',
        eyes("normal", 0, y=62) + mouth("smile", y=75) + cheeks(74, 24))
    c["fresa"] = (grad("g5", "#ff5a6b", "#d7263d"),
        '<path d="M60 102 C36 88 24 66 28 50 C32 34 48 32 60 38 C72 32 88 34 92 50 C96 66 84 88 60 102Z" fill="url(#g5)"/>'
        '<path d="M44 30 C50 22 56 28 60 34 C64 28 70 22 76 30 C70 34 64 36 60 38 C56 36 50 34 44 30Z" fill="#43a047"/>'
        '<g fill="#ffe082"><ellipse cx="42" cy="56" rx="1.6" ry="2.4"/><ellipse cx="78" cy="56" rx="1.6" ry="2.4"/><ellipse cx="46" cy="80" rx="1.6" ry="2.4"/><ellipse cx="74" cy="80" rx="1.6" ry="2.4"/><ellipse cx="60" cy="90" rx="1.6" ry="2.4"/></g>',
        eyes("happy", 0, y=60, dx=12) + mouth("grin", y=72) + cheeks(70, 20))
    c["taco"] = (grad("g6", "#f5c16c", "#e09a3c"),
        '<path d="M26 82 C28 60 40 46 44 50 C48 40 56 44 60 42 C64 44 72 40 76 50 C80 46 92 60 94 82Z" fill="#7cc55a"/>'
        '<g fill="#e53935"><circle cx="44" cy="56" r="5"/><circle cx="74" cy="54" r="5"/></g>'
        '<path d="M20 86 C20 64 38 50 60 50 C82 50 100 64 100 86Z" fill="url(#g6)"/>',
        eyes("normal", 0, y=68, dx=14) + mouth("smile", y=77) + cheeks(76, 24))
    c["gota"] = (grad("g7", "#6ec1ff", "#2b8de0"),
        '<path d="M60 16 C60 16 90 52 90 72 C90 90 76 102 60 102 C44 102 30 90 30 72 C30 52 60 16 60 16Z" fill="url(#g7)"/>'
        '<path d="M44 66 C44 56 50 48 52 46" stroke="#fff" stroke-opacity=".7" stroke-width="4" stroke-linecap="round" fill="none"/>',
        eyes("happy", 0, y=70) + mouth("smile", y=80) + cheeks(80, 20))
    c["mancuerna"] = (grad("g8", "#5b6272", "#343945"),
        '<rect x="16" y="40" width="16" height="44" rx="6" fill="url(#g8)"/><rect x="88" y="40" width="16" height="44" rx="6" fill="url(#g8)"/>'
        '<rect x="30" y="50" width="60" height="24" rx="8" fill="#9aa0ad"/><rect x="36" y="36" width="48" height="52" rx="16" fill="url(#g8)"/>',
        '<g transform="translate(60 62) scale(.9) translate(-60 -62)">' + eyes("happy", 0, y=58, dx=10).replace(INK, "#fff") +
        mouth("grin", y=70).replace(INK, "#fff").replace('stroke="#fff" stroke-width="2.4"', f'stroke="{INK}" stroke-width="2.4"') + '</g>' + cheeks(68, 16))
    return c

# Composición: fila de atrás más alta y pequeña, fila de adelante más grande. (nombre, x, y, escala, giro)
LAYOUT = [
    ("gota",      100, 196, 1.34, -10),
    ("aguacate",  196, 170, 1.40, -4),
    ("brocoli",   316, 170, 1.40, 4),
    ("fresa",     412, 196, 1.34, 10),
    ("mancuerna",  98, 342, 1.30, -8),
    ("huevo",     204, 330, 1.46, -3),
    ("dona",      314, 334, 1.44, 4),
    ("taco",      418, 350, 1.34, 9),
]

def build():
    chars = characters()
    defs = "".join(chars[n][0] for n, *_ in LAYOUT)
    groups = []
    for name, x, y, s, rot in LAYOUT:
        _, body, face = chars[name]
        # Centro del personaje en (60, 60) de su caja; sombra propia a sus pies.
        groups.append(
            f'<g transform="translate({x} {y}) rotate({rot}) scale({s}) translate(-60 -60)">'
            f'<ellipse cx="60" cy="104" rx="30" ry="5" fill="#000" fill-opacity=".22"/>{body}{face}</g>'
        )
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="#2a4fa8"/>
      <stop offset=".55" stop-color="#101a38"/>
      <stop offset="1" stop-color="#05070b"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#8fb4ff" stop-opacity=".45"/>
      <stop offset="1" stop-color="#8fb4ff" stop-opacity="0"/>
    </radialGradient>
    {defs}
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <ellipse cx="256" cy="260" rx="250" ry="210" fill="url(#glow)"/>
  <ellipse cx="256" cy="430" rx="220" ry="24" fill="#000" fill-opacity=".28"/>
  {"".join(groups)}
  
</svg>
'''

if __name__ == "__main__":
    open("public/icon.svg", "w").write(build())
    print("public/icon.svg listo")
