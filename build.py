#!/usr/bin/env python3
"""Build-Script: Konvertiert Medien und erzeugt data.js für die WM 2026 Homepage"""

import json, re, os, subprocess
from pathlib import Path

BASE = Path("/home/foerster_schule/Schreibtisch/WM 2026")
ASSETS = BASE / "assets"
IMAGES = ASSETS / "images"
AUDIO = ASSETS / "audio"
IMAGES.mkdir(parents=True, exist_ok=True)
AUDIO.mkdir(parents=True, exist_ok=True)


def fix_json(text):
    """Behebt JSON-Fehler bei typografischen Anführungszeichen wie „Wort"."""
    return re.sub(r'„([^""„"]*?)"', lambda m: '„' + m.group(1) + '"', text)


def load_json(path):
    try:
        raw = Path(path).read_text(encoding="utf-8")
        fixed = fix_json(raw)
        return json.loads(fixed)
    except Exception as e:
        print(f"  WARNUNG: Konnte {path} nicht laden: {e}")
        return None


def ffmpeg_img(src, dst, width):
    src, dst = Path(src), Path(dst)
    if not src.exists():
        print(f"  FEHLT: {src}")
        return False
    if dst.exists():
        return True
    result = subprocess.run(
        ["ffmpeg", "-i", str(src), "-vf", f"scale={width}:-2",
         "-c:v", "libwebp", "-q:v", "82", "-y", str(dst)],
        capture_output=True
    )
    if result.returncode == 0:
        print(f"  ✓ {src.name} → {dst.name}")
        return True
    else:
        print(f"  ✗ Fehler bei {src.name}: {result.stderr.decode()[-200:]}")
        return False


def ffmpeg_audio(src, dst):
    src, dst = Path(src), Path(dst)
    if not src.exists():
        print(f"  FEHLT: {src}")
        return False
    if dst.exists():
        return True
    result = subprocess.run(
        ["ffmpeg", "-i", str(src), "-codec:a", "libmp3lame", "-b:a", "128k", "-y", str(dst)],
        capture_output=True
    )
    if result.returncode == 0:
        print(f"  ✓ {src.name} → {dst.name}")
        return True
    else:
        print(f"  ✗ Fehler bei {src.name}: {result.stderr.decode()[-200:]}")
        return False


# =============================================================================
# Vollständige Länderliste mit Dateinamen-Mapping
# =============================================================================
# Felder: gruppe, json_datei, id (normalisiert),
#         flagge_src, karte_src, postkarte_src, trikot_src (Dateinamen ohne Prefix/Suffix)
#         hymne_src (voller Dateiname mit Extension) oder None wenn nicht vorhanden

LAENDER_MAPPING = [
    # Gruppe A
    {"gruppe": "A", "json": "Mexiko", "id": "mexiko",
     "flagge": "Mexiko", "karte": "Mexiko", "postkarte": "Mexiko", "trikot": "Mexiko",
     "hymne": "Hymne Mexiko.ogg"},
    {"gruppe": "A", "json": "Südafrika", "id": "suedafrika",
     "flagge": "Südafrika", "karte": "Südafrika", "postkarte": "Südafrika", "trikot": "Südafrika",
     "hymne": "Hymne Südafrika.oga"},
    {"gruppe": "A", "json": "Südkorea", "id": "suedkorea",
     "flagge": "Südkorea", "karte": "Südkorea", "postkarte": "Südkorea", "trikot": "Südkorea",
     "hymne": "Hymne Südkorea.wav"},
    {"gruppe": "A", "json": "Tschechien", "id": "tschechien",
     "flagge": "Tschechien", "karte": "Tschechien", "postkarte": "Tschechien", "trikot": "Tschechien",
     "hymne": "Hymne Tschechien.ogg"},
    # Gruppe B
    {"gruppe": "B", "json": "Bosnien-Herzegowina", "id": "bosnien-herzegowina",
     "flagge": "Bosnien Herzegovina", "karte": "Bosnien Herzegovina",
     "postkarte": "Bosnien Herzegovina", "trikot": "Bosnien",
     "hymne": None},  # Keine Hymne (Urheberrecht)
    {"gruppe": "B", "json": "Kanada", "id": "kanada",
     "flagge": "Kanada", "karte": "Kanada", "postkarte": "Kanada", "trikot": "Kanada",
     "hymne": "Hymne Kanada.ogg"},
    {"gruppe": "B", "json": "Katar", "id": "katar",
     "flagge": "Katar", "karte": "Katar", "postkarte": "Katar", "trikot": "Katar",
     "hymne": "Hymne Katar.ogg"},
    {"gruppe": "B", "json": "Schweiz", "id": "schweiz",
     "flagge": "Schweiz", "karte": "Schweiz", "postkarte": "Schweiz", "trikot": "Schweiz",
     "hymne": "Hymne Schweiz.ogg"},
    # Gruppe C
    {"gruppe": "C", "json": "Brasilien", "id": "brasilien",
     "flagge": "Brasilien", "karte": "Brasilien", "postkarte": "Brasilien", "trikot": "Brasilien",
     "hymne": "Hymne Brasilien.ogg"},
    {"gruppe": "C", "json": "Haiti", "id": "haiti",
     "flagge": "Haiti", "karte": "Haiti", "postkarte": "Haiti", "trikot": "Haiti",
     "hymne": "Hymne Haiti.ogg"},
    {"gruppe": "C", "json": "Marokko", "id": "marokko",
     "flagge": "Marokko", "karte": "Marokko", "postkarte": "Marokko", "trikot": "Marokko",
     "hymne": "Hymne Marokko.ogg"},
    {"gruppe": "C", "json": "Schottland", "id": "schottland",
     "flagge": "Schottland", "karte": "Schottland", "postkarte": "Schottland", "trikot": "Schottland",
     "hymne": None},  # Keine Hymne (Urheberrecht)
    # Gruppe D
    {"gruppe": "D", "json": "Australien", "id": "australien",
     "flagge": "Australien", "karte": "Australien", "postkarte": "Australien", "trikot": "Australien",
     "hymne": "Hymne Australien.ogg"},
    {"gruppe": "D", "json": "Paraguay", "id": "paraguay",
     "flagge": "Paraguay", "karte": "Paraguay", "postkarte": "Paraguay", "trikot": "Paraguay",
     "hymne": "Hymne Paraguay.oga"},
    {"gruppe": "D", "json": "Türkei", "id": "tuerkei",
     "flagge": "Türkei", "karte": "Türkei", "postkarte": "Türkei", "trikot": "Türkei",
     "hymne": "Hymne Türkei.ogg"},
    {"gruppe": "D", "json": "USA", "id": "usa",
     "flagge": "USA", "karte": "USA", "postkarte": "USA", "trikot": "USA",
     "hymne": "Hymne USA.ogg"},
    # Gruppe E
    {"gruppe": "E", "json": "Curacao", "id": "curacao",
     "flagge": "Curacao", "karte": "Curacao", "postkarte": "Curacao", "trikot": "Curacao",
     "hymne": "Hymne Curacao.ogg"},
    {"gruppe": "E", "json": "Deutschland", "id": "deutschland",
     "flagge": "Deutschland", "karte": "Deutschland", "postkarte": "Deutschland", "trikot": "Deutschland",
     "hymne": "Hymne Deutschland.mp3"},
    {"gruppe": "E", "json": "Ecuador", "id": "ecuador",
     "flagge": "Ecuador", "karte": "Ecuador", "postkarte": "Ecuador", "trikot": "Ecuador",
     "hymne": "Hymne Ecuador.ogg"},
    {"gruppe": "E", "json": "Elfenbeinküste", "id": "elfenbeinkueste",
     "flagge": "Elfenbeinküste", "karte": "Elfenbeinküste", "postkarte": "Elfenbeinküste",
     "trikot": "Elfenbeinküste", "hymne": "Hymne Elfenbeinküste.ogg"},
    # Gruppe F
    {"gruppe": "F", "json": "Japan", "id": "japan",
     "flagge": "Japan", "karte": "Japan", "postkarte": "Japan", "trikot": "Japan",
     "hymne": "Hymne Japan.ogg"},
    {"gruppe": "F", "json": "Niederlande", "id": "niederlande",
     "flagge": "Niederlande", "karte": "Niederlande", "postkarte": "Niederlande", "trikot": "Niederlande",
     "hymne": "Hymne Niederlande.ogg"},
    {"gruppe": "F", "json": "Schweden", "id": "schweden",
     "flagge": "Schweden", "karte": "Schweden", "postkarte": "Schweden", "trikot": "Schweden",
     "hymne": "Hymne Schweden.ogg"},
    {"gruppe": "F", "json": "Tunesien", "id": "tunesien",
     "flagge": "Tunesien", "karte": "Tunesien", "postkarte": "Tunesien", "trikot": "Tunesien",
     "hymne": "Hymne Tunesien.ogg"},
    # Gruppe G
    {"gruppe": "G", "json": "Ägypten", "id": "aegypten",
     "flagge": "Ägypten", "karte": "Ägypten", "postkarte": "Ägypten", "trikot": "Ägypten",
     "hymne": "Hymne Ägypten.ogg"},
    {"gruppe": "G", "json": "Belgien", "id": "belgien",
     "flagge": "Belgien", "karte": "Belgien", "postkarte": "Belgien", "trikot": "Belgien",
     "hymne": "Hymne Belgien.oga"},
    {"gruppe": "G", "json": "Iran", "id": "iran",
     "flagge": "Iran", "karte": "Iran", "postkarte": "Iran", "trikot": "Iran",
     "hymne": "Hymne Iran.oga"},
    {"gruppe": "G", "json": "Neuseeland", "id": "neuseeland",
     "flagge": "Neuseeland", "karte": "Neuseeland", "postkarte": "Neuseeland", "trikot": "Neuseeland",
     "hymne": "Hymne Neuseeland.ogg"},
    # Gruppe H
    {"gruppe": "H", "json": "Kap Verde", "id": "kap-verde",
     "flagge": "Kap Verde", "karte": "Kap Verde", "postkarte": "Kap Verde", "trikot": "Kap Verde",
     "hymne": "Hymne Kap Verde.ogg"},
    {"gruppe": "H", "json": "Saudi-Arabien", "id": "saudi-arabien",
     "flagge": "Saudi Arabien", "karte": "Saudi Arabien", "postkarte": "Saudi Arabien",
     "trikot": "Saudi Arabien", "hymne": "Hymne Saudi-Arabien.oga"},
    {"gruppe": "H", "json": "Spanien", "id": "spanien",
     "flagge": "Spanien", "karte": "Spanien", "postkarte": "Spanien", "trikot": "Spanien",
     "hymne": "Hymne Spanien.ogg"},
    {"gruppe": "H", "json": "Urugua", "id": "uruguay",
     "flagge": "Uruguay", "karte": "Uruguay", "postkarte": "Uruguay", "trikot": "Uruguay",
     "hymne": "Hymne Uruguay.ogg"},
    # Gruppe I
    {"gruppe": "I", "json": "Frankreich", "id": "frankreich",
     "flagge": "Frankreich", "karte": "Frankreich", "postkarte": "Frankreich", "trikot": "Frankreich",
     "hymne": "Hymne Frankreich.ogg"},
    {"gruppe": "I", "json": "Irak", "id": "irak",
     "flagge": "Irak", "karte": "Irak", "postkarte": "Irak", "trikot": "Irak",
     "hymne": "Hymne Irak.ogg"},
    {"gruppe": "I", "json": "Norwegen", "id": "norwegen",
     "flagge": "Norwegen", "karte": "Norwegen", "postkarte": "Norwegen", "trikot": "Norwegen",
     "hymne": "Hymne Norwegen.ogg"},
    {"gruppe": "I", "json": "Senegal", "id": "senegal",
     "flagge": "Senegal", "karte": "Senegal", "postkarte": "Senegal", "trikot": "Senegal",
     "hymne": "Hymne Senegal.ogg"},
    # Gruppe J
    {"gruppe": "J", "json": "Algerien", "id": "algerien",
     "flagge": "Algerien", "karte": "Algerien", "postkarte": "Algerien", "trikot": "Algerien",
     "hymne": "Hymne Algerien.ogg"},
    {"gruppe": "J", "json": "Argentinien", "id": "argentinien",
     "flagge": "Argentinien", "karte": "Argentinien", "postkarte": "Argentinien", "trikot": "Argentinien",
     "hymne": "Hymne Argentinien.ogg"},
    {"gruppe": "J", "json": "Jordanien", "id": "jordanien",
     "flagge": "Jordanien", "karte": "Jordanien", "postkarte": "Jordanien", "trikot": "Jordanien",
     "hymne": "Hymne Jordanien.ogg"},
    {"gruppe": "J", "json": "Österreich", "id": "oesterreich",
     "flagge": "Österreich", "karte": "Österreich", "postkarte": "Österreich", "trikot": "Österreich",
     "hymne": "Hymne Österreich.ogg"},
    # Gruppe K
    {"gruppe": "K", "json": "DR-Kongo", "id": "dr-kongo",
     "flagge": "DR Kongo", "karte": "DR Kongo", "postkarte": "Kongo", "trikot": "Kongo",
     "hymne": "Hymne Kongo.ogg"},
    {"gruppe": "K", "json": "Kolumbien", "id": "kolumbien",
     "flagge": "Kolumbien", "karte": "Kolumbien", "postkarte": "Kolumbien", "trikot": "Kolumbien",
     "hymne": "Hymne Kolumbien.ogg"},
    {"gruppe": "K", "json": "Portugal", "id": "portugal",
     "flagge": "Portugal", "karte": "Portugal", "postkarte": "Portugal", "trikot": "Portugal",
     "hymne": "Hymne Portugal.ogg"},
    {"gruppe": "K", "json": "Usbekistan", "id": "usbekistan",
     "flagge": "Usbekistan", "karte": "Usbekistan", "postkarte": "Usbekistan", "trikot": "Usbekistan",
     "hymne": "Hymne Usbekistan.ogg"},
    # Gruppe L
    {"gruppe": "L", "json": "England", "id": "england",
     "flagge": "England", "karte": "England", "postkarte": "England", "trikot": "England",
     "hymne": "Hymne England.oga"},
    {"gruppe": "L", "json": "Ghana", "id": "ghana",
     "flagge": "Ghana", "karte": "Ghana", "postkarte": "Ghana", "trikot": "Ghana",
     "hymne": "Hymne Ghana.ogg"},
    {"gruppe": "L", "json": "Kroatien", "id": "kroatien",
     "flagge": "Kroatien", "karte": "Kroatien", "postkarte": "Kroatien", "trikot": "Kroatien",
     "hymne": "Hymne Kroatien.ogg"},
    {"gruppe": "L", "json": "Panama", "id": "panama",
     "flagge": "Panama", "karte": "Panama", "postkarte": "Panama", "trikot": "Panama",
     "hymne": "Hymne Panama.ogg"},
]


def build():
    gruppen_data = {}  # gruppe -> list of country dicts
    all_laender = {}   # id -> country data dict

    for m in LAENDER_MAPPING:
        gruppe = m["gruppe"]
        gruppe_dir = BASE / f"Gruppe {gruppe}"
        lid = m["id"]

        print(f"\n[Gruppe {gruppe}] {lid}")

        # JSON laden
        json_path = gruppe_dir / f"{m['json']}.json"
        data = load_json(json_path)
        if data is None:
            data = {"land": m["json"], "id": lid}

        # Bilder konvertieren
        flagge_webp = IMAGES / f"flagge-{lid}.webp"
        karte_webp = IMAGES / f"karte-{lid}.webp"
        postkarte_webp = IMAGES / f"postkarte-{lid}.webp"
        trikot_webp = IMAGES / f"trikot-{lid}.webp"

        ffmpeg_img(gruppe_dir / f"Flagge {m['flagge']}.png", flagge_webp, 420)
        ffmpeg_img(gruppe_dir / f"Karte {m['karte']}.png", karte_webp, 800)
        ffmpeg_img(gruppe_dir / f"Postkarte {m['postkarte']}.png", postkarte_webp, 800)
        ffmpeg_img(gruppe_dir / f"Trikot {m['trikot']} ohne.png", trikot_webp, 360)

        # Audio konvertieren
        hymne_mp3_path = None
        if m["hymne"] is not None:
            hymne_src = gruppe_dir / m["hymne"]
            hymne_mp3 = AUDIO / f"hymne-{lid}.mp3"
            if m["hymne"].endswith(".mp3"):
                # Bereits MP3 - nur kopieren/umformatieren
                if not hymne_mp3.exists():
                    import shutil
                    shutil.copy2(hymne_src, hymne_mp3)
                    print(f"  ✓ {m['hymne']} → {hymne_mp3.name}")
            else:
                ffmpeg_audio(hymne_src, hymne_mp3)
            hymne_mp3_path = f"assets/audio/hymne-{lid}.mp3"

        # Assets in Daten einbauen
        data["_id"] = lid
        data["_gruppe"] = gruppe
        data["_assets"] = {
            "flagge": f"assets/images/flagge-{lid}.webp",
            "karte": f"assets/images/karte-{lid}.webp",
            "postkarte": f"assets/images/postkarte-{lid}.webp",
            "trikot": f"assets/images/trikot-{lid}.webp",
            "hymne": hymne_mp3_path,
        }

        all_laender[lid] = data
        if gruppe not in gruppen_data:
            gruppen_data[gruppe] = []
        gruppen_data[gruppe].append(lid)

    # data.js schreiben
    data_js_path = BASE / "data.js"
    with open(data_js_path, "w", encoding="utf-8") as f:
        f.write("// Automatisch generiert von build.py\n")
        f.write("// Enthält alle Länderdaten für die WM 2026 Homepage\n\n")
        f.write("const WM_GRUPPEN = ")
        f.write(json.dumps(gruppen_data, ensure_ascii=False, indent=2))
        f.write(";\n\n")
        f.write("const WM_LAENDER = ")
        f.write(json.dumps(all_laender, ensure_ascii=False, indent=2))
        f.write(";\n")

    print(f"\n✓ data.js geschrieben: {data_js_path}")
    print(f"✓ {len(all_laender)} Länder verarbeitet")


if __name__ == "__main__":
    build()
