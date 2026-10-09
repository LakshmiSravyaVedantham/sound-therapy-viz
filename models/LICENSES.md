# Model files (all run locally in the browser; no audio is uploaded)

## yamnet/ : YAMNet (Google, AudioSet, 521 sound classes)
- Source: Kaggle / TF Hub `google/yamnet/tfJs/tfjs/1` (TensorFlow.js graph model).
- License: **Apache License 2.0**.
- Changes: weights stored as float16 (`yamnet-f16.bin`, half the size, same graph); class names from
  `yamnet_class_map.csv` (tensorflow/models, Apache 2.0) saved as `class-names.json`.

## essentia-heads.json + essentia-heads-f16.bin : Essentia mood classifiers on YAMNet embeddings
- Source: MTG Essentia model zoo, `classification-heads/*/*-audioset-yamnet-1` (mood_happy, mood_sad,
  mood_relaxed, mood_aggressive, danceability, mood_party, mood_acoustic, mood_electronic).
  Author: Music Technology Group, Universitat Pompeu Fabra (https://essentia.upf.edu/models.html).
- License: **CC BY-NC-SA 4.0 (non-commercial only, share-alike, attribution required)**.
  A commercial license is available from MTG on request. Do not use these heads in a paid / commercial
  product without that license; the app still works without them (YAMNet-only or hand detector).
- Changes: the two dense layers of each head were copied from the official ONNX files into one float16 file
  and are evaluated in plain JavaScript (`ai-mood.js`).
