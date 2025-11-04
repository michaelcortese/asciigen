use image::{GenericImageView, ImageReader};
use wasm_bindgen::prelude::*;

const CHARS: &[u8] = b"@%#*+=-:. ";

#[wasm_bindgen]
pub fn to_ascii(png_bytes: &[u8], width: usize) -> Result<String, JsValue> {
    // Defensive validation
    if png_bytes.is_empty() {
        return Err(JsValue::from_str("input bytes are empty"));
    }
    if width == 0 {
        return Err(JsValue::from_str("width must be > 0"));
    }

    // Read image from bytes, mapping any image errors to JsValue so we avoid panics/unwraps.
    let cursor = std::io::Cursor::new(png_bytes);
    let reader = ImageReader::new(cursor)
        .with_guessed_format()
        .map_err(|e| JsValue::from_str(&format!("failed to guess image format: {}", e)))?;

    let decoded = reader
        .decode()
        .map_err(|e| JsValue::from_str(&format!("failed to decode image: {}", e)))?;
    let img = decoded.grayscale();

    let (w, h) = img.dimensions();
    if w == 0 || h == 0 {
        return Err(JsValue::from_str("decoded image has zero width or height"));
    }

    // Preserve aspect ratio: compute new height and ensure it's at least 1
    let new_h = (((h as f32) * (width as f32) / (w as f32) / 2.0).max(1.0)) as u32;

    let resized = img.resize_exact(width as u32, new_h, image::imageops::FilterType::Lanczos3);

    // as_luma8 returns Option<&ImageBuffer<...>>
    let pixels = match resized.as_luma8() {
        Some(p) => p,
        None => {
            return Err(JsValue::from_str(
                "failed to convert resized image to grayscale pixels",
            ));
        }
    };

    // Pre-allocate approximate capacity: width chars + newline per row
    let mut out = String::with_capacity((width + 1) * (new_h as usize));

    for y in 0..new_h {
        for x in 0..(width as u32) {
            let pixel = pixels.get_pixel(x, y)[0] as f32;
            // normalize and clamp to valid index
            let ratio = (pixel / 255.0).clamp(0.0, 1.0);
            let mut idx = (ratio * ((CHARS.len() - 1) as f32)).round() as usize;
            if idx >= CHARS.len() {
                idx = CHARS.len() - 1;
            }
            out.push(CHARS[idx] as char);
        }
        out.push('\n');
    }

    Ok(out)
}
