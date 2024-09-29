use prost::Message;
use std::cell::RefCell;
use tract_onnx::prelude::*;
use image::GenericImageView;

type Model = SimplePlan<TypedFact, Box<dyn TypedOp>, Graph<TypedFact, Box<dyn TypedOp>>>;

thread_local! {
    static MODEL: RefCell<Option<Model>> = RefCell::new(None);
}

/// The serialized ONNX model for Argentinian ID validation.
const ARGENTINIAN_ID_VALIDATION: &'static [u8] = include_bytes!("../assets/quantized_dni_img_val_V0.onnx");

/// Validation result structure.
pub struct ValidationResult {
    pub label: String,
    pub score: f32,
}

/// Constructs a runnable model from the serialized ONNX model in `ARGENTINIAN_ID_VALIDATION`.
pub fn setup() -> TractResult<()> {
    let bytes = bytes::Bytes::from_static(ARGENTINIAN_ID_VALIDATION);
    let proto: tract_onnx::pb::ModelProto = tract_onnx::pb::ModelProto::decode(bytes)?;
    let model = tract_onnx::onnx()
        .model_for_proto_model(&proto)?
        .into_optimized()?
        .into_runnable()?;
    MODEL.with(|m| {
        *m.borrow_mut() = Some(model);
    });
    // MODEL.with_borrow_mut(|m| {
    //     *m = Some(model);
    // });
    Ok(())
}

// Runs the model on the given ID image and returns the validation result.
//best model for now
pub fn validate_id(image: Vec<u8>) -> Result<ValidationResult, anyhow::Error> {
    MODEL.with(|model| {
        let model_ref = model.borrow();
        let model = model_ref.as_ref().ok_or_else(|| anyhow::anyhow!("Model is not loaded"))?;

        let img: image::ImageBuffer<image::Rgb<u8>, Vec<u8>> = image::load_from_memory(&image)?.to_rgb8();
        let (width, height) = img.dimensions();

        // Preprocess the image according to your model's requirements.
        let resized_img: image::ImageBuffer<image::Rgb<u8>, Vec<u8>> = image::imageops::resize(&img, 224, 224, ::image::imageops::FilterType::Triangle);

        // Normalize the image as per the PyTorch transforms.
        let tensor = tract_ndarray::Array4::from_shape_fn((1, 3, 224, 224), |(_, c, y, x)| {
            let pixel = resized_img.get_pixel(x as u32, y as u32);
            let value = pixel[c] as f32 / 255.0;
            match c {
                0 => (value - 0.485) / 0.229,
                1 => (value - 0.456) / 0.224,
                2 => (value - 0.406) / 0.225,
                _ => unreachable!(),
            }
        });

        // Run the model.
        let result = model.run(tvec!(Tensor::from(tensor).into()))?;

        // Get the predicted class and confidence score.
        let scores: tract_ndarray::ArrayViewD<f32> = result[0].to_array_view::<f32>()?;
        let (max_index, max_score) = scores
            .iter()
            .enumerate()
            .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap())
            .ok_or_else(|| anyhow::anyhow!("Failed to find max score"))?;

        let classes = ["invalid", "valid_back", "valid_front"];
        let label = classes.get(max_index).unwrap_or(&"unknown").to_string();

        Ok(ValidationResult {
            label,
            score: *max_score,
        })
    })
}

// pub fn validate_id(image: Vec<u8>) -> Result<ValidationResult, anyhow::Error> {
//     // Check if the image size is reasonable before processing
//     if image.len() > 5 * 1024 * 1024 { // Limit to 5MB
//         return Err(anyhow::anyhow!("Image size too large"));
//     }

//     MODEL.with(|model| {
//         let model_ref = model.borrow();
//         let model = model_ref.as_ref().ok_or_else(|| anyhow::anyhow!("Model is not loaded"))?;

//         // Load and resize the image in one step
//         let img = image::load_from_memory(&image)?.to_rgb8();
//         let resized_img = image::imageops::resize(&img, 224, 224, ::image::imageops::FilterType::Triangle);

//         // Create tensor directly from resized image
//         let tensor = tract_ndarray::Array4::from_shape_fn((1, 3, 224, 224), |(_, c, y, x)| {
//             let pixel = resized_img.get_pixel(x as u32, y as u32);
//             let value = pixel[c] as f32 / 255.0;
//             match c {
//                 0 => (value - 0.485) / 0.229,
//                 1 => (value - 0.456) / 0.224,
//                 2 => (value - 0.406) / 0.225,
//                 _ => unreachable!(),
//             }
//         });

//         // Run the model
//         let result = model.run(tvec!(Tensor::from(tensor).into()))?;

//         // Find max score
//         let scores: tract_ndarray::ArrayViewD<f32> = result[0].to_array_view::<f32>()?;
//         let (max_index, max_score) = scores
//             .iter()
//             .enumerate()
//             .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap())
//             .ok_or_else(|| anyhow::anyhow!("Failed to find max score"))?;

//         let classes = ["invalid", "valid_back", "valid_front"];
//         let label = classes.get(max_index).unwrap_or(&"unknown").to_string();

//         Ok(ValidationResult {
//             label,
//             score: *max_score,
//         })
//     })
// }
