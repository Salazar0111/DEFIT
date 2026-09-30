"""Genera los avatares provisionales y sus ánimos.

public/avatars/<id>.svg          cara característica (la que se elige en el perfil)
public/avatars/<id>/<mood>.svg   ánimos: happy, sleepy, worried, party, surprised

Para usar arte propio, reemplaza esos archivos con el mismo nombre.
Uso: python3 scripts/avatars.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
os.chdir(os.path.join(os.path.dirname(__file__), ".."))
from characters import IDS, MOODS, avatar_svg  # noqa: E402

for aid, name in IDS.items():
    open(f"public/avatars/{aid}.svg", "w").write(avatar_svg(name))
    os.makedirs(f"public/avatars/{aid}", exist_ok=True)
    for mood in MOODS:
        open(f"public/avatars/{aid}/{mood}.svg", "w").write(avatar_svg(name, mood))
print(f"{len(IDS)} avatares × {len(MOODS) + 1} caras")
