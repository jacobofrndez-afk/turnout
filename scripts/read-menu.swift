// Local, offline menu transcription using macOS Vision. Image bytes arrive on stdin.
import Foundation
import Vision
import ImageIO

struct Line: Codable { let text: String; let confidence: Float }
do {
    let data = FileHandle.standardInput.readDataToEndOfFile()
    guard data.count > 0 && data.count <= 5 * 1024 * 1024,
          let source = CGImageSourceCreateWithData(data as CFData, nil),
          let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
          let width = properties[kCGImagePropertyPixelWidth] as? Int,
          let height = properties[kCGImagePropertyPixelHeight] as? Int,
          width > 0 && height > 0 && width <= 12000 && height <= 12000 && width * height <= 25000000
    else { throw NSError(domain: "Image", code: 1) }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["en-US", "fr-FR"]
    request.usesLanguageCorrection = true
    try VNImageRequestHandler(data: data).perform([request])
    let lines = (request.results ?? []).sorted { a, b in
        if abs(a.boundingBox.midY - b.boundingBox.midY) > 0.015 { return a.boundingBox.midY > b.boundingBox.midY }
        return a.boundingBox.minX < b.boundingBox.minX
    }.prefix(150).compactMap { observation -> Line? in
        guard let candidate = observation.topCandidates(1).first else { return nil }
        return Line(text: candidate.string, confidence: candidate.confidence)
    }
    FileHandle.standardOutput.write(try JSONEncoder().encode(lines))
} catch {
    FileHandle.standardError.write(Data("Could not read this image.\n".utf8))
    exit(1)
}
