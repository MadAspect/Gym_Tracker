"""Makes the app icons (icons/icon-192.png and icons/icon-512.png).
Needs Pillow:  pip install pillow

    python tools/make_icons.py                 -> draws the default dumbbell icon
    python tools/make_icons.py my-logo.png     -> uses your own image instead

Change the colours below to restyle the default icon."""
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter

BG = (0, 0, 0)            # background colour
GLOW = (118, 82, 255)     # soft glow in the top-left corner
PLATE = (255, 255, 255)   # big plates
ACCENT = (181, 156, 255)  # small outer plates
S = 1024                  # drawn large, then shrunk for crisp edges

def default_icon():
    im = Image.new("RGB", (S, S), BG)
    glow = Image.new("RGB", (S, S), BG)
    ImageDraw.Draw(glow).ellipse([-260, -300, 640, 520], fill=tuple(int(c * .6) for c in GLOW))
    im = ImageChops.add(im, glow.filter(ImageFilter.GaussianBlur(170)))
    bell = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(bell)
    d.rectangle([346, 490, 678, 534], fill=PLATE)  # bar, only between the big plates
    for x0, x1, h, col in [(346, 408, 370, PLATE), (276, 330, 280, PLATE), (214, 260, 190, ACCENT)]:
        for a, b in [(x0, x1), (S - x1, S - x0)]:               # left plate, then its mirror on the right
            d.rounded_rectangle([a, 512 - h // 2, b, 512 + h // 2], 16, fill=col)
    bell = bell.rotate(-35, resample=Image.BICUBIC)             # tilt for energy
    return Image.alpha_composite(im.convert("RGBA"), bell).convert("RGB")

def custom_icon(path):
    src = Image.open(path).convert("RGBA")
    box = int(S * .7)                                           # keep inside the safe zone so round masks don't clip it
    src.thumbnail((box, box))
    im = Image.new("RGB", (S, S), BG)
    im.paste(src, ((S - src.width) // 2, (S - src.height) // 2), src)
    return im

icon = custom_icon(sys.argv[1]) if len(sys.argv) > 1 else default_icon()
for n in (192, 512):
    icon.resize((n, n), Image.LANCZOS).save(f"icons/icon-{n}.png")
print("Saved icons/icon-192.png and icons/icon-512.png")
