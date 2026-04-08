import sys
from PIL import Image

def fix_grass(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    bbox = img.getbbox()
    if not bbox:
        return
    cropped = img.crop(bbox)
    # The game expects grass to be tightly cropped 962x546, as it sets it to halfW*2, dBot-dTop
    # tgt_w = 481 * 2 = 962, tgt_h = 273 * 2 = 546
    resized = cropped.resize((962, 546), Image.LANCZOS)
    resized.save(output_path)
    print(f"Grass saved: {output_path}")

def fix_water(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    bbox = img.getbbox()
    if not bbox:
        return
    cropped = img.crop(bbox)
    # W_TOP_Y_SRC = 119, W_LEFT_SRC = 73, W_HALF_W = 439
    # W_WIDTH = 439 * 2 = 878
    # W_HEIGHT is likely proportional. For a true 2:1 isometric, height is half of width.
    # W_HEIGHT = 878 / 2 = 439
    # But let's assume height is similar ratio to grass (962/546 = 1.761)
    # W_HEIGHT = 878 / 1.761 = 498
    w_width = 878
    w_height = 498
    resized = cropped.resize((w_width, w_height), Image.LANCZOS)
    
    out = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    # left = 73, top = 119
    out.paste(resized, (73, 119), resized)
    out.save(output_path)
    print(f"Water saved: {output_path}")

try:
    fix_grass("C:/Users/Ajibola Adedeji/Documents/GitHub/kingdom/public/assets/game/terrain/grass-tile-1.png", "C:/Users/Ajibola Adedeji/Documents/GitHub/kingdom/public/assets/game/terrain/grass-fixed.png")
    fix_water("C:/Users/Ajibola Adedeji/Documents/GitHub/kingdom/public/assets/game/terrain/water-tile-1.png", "C:/Users/Ajibola Adedeji/Documents/GitHub/kingdom/public/assets/game/terrain/water-fixed.png")
except Exception as e:
    import traceback
    traceback.print_exc()
