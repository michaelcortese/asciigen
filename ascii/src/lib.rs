use wasm_bindgen::prelude::*;
use image::{ImageReader, GenericImageView};

const CHARS: &[u8] = b"@%#*+=-:. ";

#[wasm_bindgen]
pub fn to_ascii(png_bytes: &[u8], width: usize) -> String {
    // Read image from bytes
    let img = ImageReader::new(std::io::Cursor::new(png_bytes))
        .with_guessed_format()
        .unwrap()
        .decode()
        .unwrap()
        .grayscale();

    let (w, h) = img.dimensions();
    let new_h = (h * width as u32) / w / 2; // aspect ratio fix
    let resized = img.resize_exact(width as u32, new_h, image::imageops::FilterType::Lanczos3);
    let pixels = resized.as_luma8().unwrap();

    let mut out = String::new();
    for y in 0..new_h {
        for x in 0..width as u32 {
            let pixel = pixels.get_pixel(x, y)[0];
            let idx = ((pixel as f32 / 255.0) * (CHARS.len() - 1) as f32) as usize;
            out.push(CHARS[idx] as char);
        }
        out.push('\n');
    }

    out
}
