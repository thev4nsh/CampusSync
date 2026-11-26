"""Local face-template processing for the opt-in attendance prototype.

Raw camera frames are decoded and discarded in memory. The database stores only
Fernet-encrypted, normalized face crops used by OpenCV's LBPH recognizer.
"""

from __future__ import annotations

from typing import Iterable, Optional

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

try:
    import cv2
    import numpy as np
except ImportError:  # Keep the rest of the API available if the optional feature is not installed.
    cv2 = None
    np = None


class FaceRecognitionError(Exception):
    def __init__(self, message: str, status_code: int = 422):
        super().__init__(message)
        self.status_code = status_code


class FaceRecognitionService:
    REQUIRED_SAMPLES = 3
    MAX_FRAME_BYTES = 2_000_000
    NORMALIZED_SIZE = (200, 200)

    @staticmethod
    def _require_runtime() -> None:
        if cv2 is None or np is None or not hasattr(cv2, "face"):
            raise FaceRecognitionError(
                "Local face recognition is unavailable. Install the backend OpenCV contrib dependency.",
                status_code=503,
            )
        if not settings.BIOMETRIC_ENCRYPTION_KEY:
            raise FaceRecognitionError(
                "Face features are disabled until BIOMETRIC_ENCRYPTION_KEY is configured.",
                status_code=503,
            )

    @staticmethod
    def _cipher() -> Fernet:
        try:
            return Fernet(settings.BIOMETRIC_ENCRYPTION_KEY.encode("ascii"))
        except (AttributeError, UnicodeEncodeError, ValueError) as exc:
            raise FaceRecognitionError(
                "BIOMETRIC_ENCRYPTION_KEY is invalid; generate a Fernet key and restart the backend.",
                status_code=503,
            ) from exc

    @staticmethod
    def _decode_frame(frame_bytes: bytes):
        if not frame_bytes or len(frame_bytes) > FaceRecognitionService.MAX_FRAME_BYTES:
            raise FaceRecognitionError("Camera frame must be under 2 MB.")
        encoded = np.frombuffer(frame_bytes, dtype=np.uint8)
        image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
        if image is None or image.size == 0:
            raise FaceRecognitionError("The uploaded camera frame could not be decoded.")
        height, width = image.shape[:2]
        if width < 240 or height < 180 or width > 4096 or height > 4096:
            raise FaceRecognitionError("Camera frame dimensions are outside the supported range.")
        return image

    @staticmethod
    def _face_crop(image):
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        detector = cv2.CascadeClassifier(cascade_path)
        if detector.empty():
            raise FaceRecognitionError("The local face detector could not be loaded.", status_code=503)
        faces = detector.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(90, 90),
        )
        if len(faces) == 0:
            raise FaceRecognitionError("No face found. Move closer and face the camera.")
        if len(faces) > 1:
            raise FaceRecognitionError("Only one person should be visible during capture.")

        x, y, width, height = [int(value) for value in faces[0]]
        margin_x = int(width * 0.18)
        margin_y = int(height * 0.18)
        left = max(0, x - margin_x)
        top = max(0, y - margin_y)
        right = min(gray.shape[1], x + width + margin_x)
        bottom = min(gray.shape[0], y + height + margin_y)
        crop = gray[top:bottom, left:right]
        crop = cv2.resize(crop, FaceRecognitionService.NORMALIZED_SIZE, interpolation=cv2.INTER_AREA)
        return cv2.equalizeHist(crop)

    def encrypt_face_template(self, frame_bytes: bytes) -> str:
        self._require_runtime()
        face = self._face_crop(self._decode_frame(frame_bytes))
        success, encoded = cv2.imencode(".png", face)
        if not success:
            raise FaceRecognitionError("Could not prepare the encrypted face template.", status_code=500)
        return self._cipher().encrypt(encoded.tobytes()).decode("ascii")

    def _decrypt_template(self, encrypted_template: str):
        try:
            raw = self._cipher().decrypt(encrypted_template.encode("ascii"))
        except (InvalidToken, UnicodeEncodeError) as exc:
            raise FaceRecognitionError(
                "A stored face template cannot be decrypted. Check that the original encryption key is configured.",
                status_code=503,
            ) from exc
        image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_GRAYSCALE)
        if image is None or image.shape != (200, 200):
            raise FaceRecognitionError("A stored face template is invalid.", status_code=503)
        return image

    def recognize(
        self,
        frame_bytes: bytes,
        enrolled_students: Iterable[tuple[str, str, list[str]]],
    ) -> Optional[dict]:
        """Return a candidate only; attendance is never written by matching."""
        self._require_runtime()
        query_face = self._face_crop(self._decode_frame(frame_bytes))

        images = []
        labels = []
        label_to_student: dict[int, tuple[str, str]] = {}
        label = 0
        for student_id, name, templates in enrolled_students:
            if len(templates) < self.REQUIRED_SAMPLES:
                continue
            try:
                decoded = [self._decrypt_template(value) for value in templates]
            except FaceRecognitionError:
                continue
            label_to_student[label] = (student_id, name)
            images.extend(decoded)
            labels.extend([label] * len(decoded))
            label += 1

        if not images:
            raise FaceRecognitionError("No opted-in face templates are enrolled for this class.", status_code=404)

        try:
            recognizer = cv2.face.LBPHFaceRecognizer_create(
                radius=1,
                neighbors=8,
                grid_x=8,
                grid_y=8,
                threshold=float(settings.FACE_MATCH_THRESHOLD),
            )
            recognizer.train(images, np.asarray(labels, dtype=np.int32))
            predicted_label, distance = recognizer.predict(query_face)
        except cv2.error as exc:
            raise FaceRecognitionError("The local face matcher could not process this frame.", status_code=422) from exc

        if predicted_label < 0 or predicted_label not in label_to_student:
            return None
        student_id, name = label_to_student[predicted_label]
        return {
            "student_id": student_id,
            "student_name": name,
            "distance": round(float(distance), 2),
            "threshold": float(settings.FACE_MATCH_THRESHOLD),
        }


face_recognition_service = FaceRecognitionService()
