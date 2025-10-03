export interface PhotoDimensions {
  width: number;
  height: number;
}

export interface CameraInfo {
  make?: string;
  model?: string;
  software?: string;
}

export class PhotoMetadata {
  constructor(
    private readonly _timestamp: Date,
    private readonly _hasCameraInfo: boolean,
    private readonly _fileSize: number,
    private readonly _dimensions?: PhotoDimensions,
    private readonly _cameraInfo?: CameraInfo,
    private readonly _originalPath?: string,
  ) {
    this.validateMetadata();
  }

  static create(
    timestamp: Date,
    hasCameraInfo: boolean,
    fileSize: number,
    dimensions?: PhotoDimensions,
    cameraInfo?: CameraInfo,
    originalPath?: string,
  ): PhotoMetadata {
    return new PhotoMetadata(timestamp, hasCameraInfo, fileSize, dimensions, cameraInfo, originalPath);
  }

  static fromJSON(json: string, skipValidation: boolean = false): PhotoMetadata {
    const data = JSON.parse(json);
    
    // Para datos históricos, crear instancia sin validación estricta
    if (skipValidation) {
      const instance = Object.create(PhotoMetadata.prototype);
      instance._timestamp = new Date(data.timestamp);
      instance._hasCameraInfo = data.hasCameraInfo;
      instance._fileSize = data.fileSize || 0;
      instance._dimensions = data.dimensions;
      instance._cameraInfo = data.cameraInfo;
      instance._originalPath = data.originalPath;
      return instance;
    }
    
    return new PhotoMetadata(
      new Date(data.timestamp),
      data.hasCameraInfo,
      data.fileSize,
      data.dimensions,
      data.cameraInfo,
      data.originalPath,
    );
  }

  private validateMetadata(): void {
    if (this._fileSize <= 0) {
      throw new Error('Photo file size must be positive');
    }

    if (this._fileSize > 50 * 1024 * 1024) { // 50MB max
      throw new Error('Photo file size is too large (max 50MB)');
    }

    if (this._dimensions) {
      if (this._dimensions.width <= 0 || this._dimensions.height <= 0) {
        throw new Error('Photo dimensions must be positive');
      }

      if (this._dimensions.width < 200 || this._dimensions.height < 200) {
        throw new Error('Photo resolution is too low (min 200x200)');
      }
    }
  }

  get timestamp(): Date {
    return this._timestamp;
  }

  get hasCameraInfo(): boolean {
    return this._hasCameraInfo;
  }

  get fileSize(): number {
    return this._fileSize;
  }

  get dimensions(): PhotoDimensions | undefined {
    return this._dimensions;
  }

  get cameraInfo(): CameraInfo | undefined {
    return this._cameraInfo;
  }

  get originalPath(): string | undefined {
    return this._originalPath;
  }

  /**
   * Check if photo was taken recently (within tolerance)
   */
  isTakenRecently(currentTime: Date, toleranceMinutes: number = 2): boolean {
    const diffMinutes = Math.abs(currentTime.getTime() - this._timestamp.getTime()) / (1000 * 60);
    return diffMinutes <= toleranceMinutes;
  }

  /**
   * Check if photo appears to be a real camera photo vs screenshot
   */
  looksLikeRealPhoto(): boolean {
    // Real photos should have camera metadata
    if (!this._hasCameraInfo) {
      return false;
    }

    // Check for typical screenshot dimensions (common mobile resolutions)
    if (this._dimensions) {
      const aspectRatio = this._dimensions.width / this._dimensions.height;
      const commonScreenRatios = [16/9, 18/9, 19.5/9, 4/3, 3/2];
      
      // If it matches common screen ratios exactly, might be suspicious
      const matchesScreenRatio = commonScreenRatios.some(ratio => 
        Math.abs(aspectRatio - ratio) < 0.01
      );

      if (matchesScreenRatio && this._fileSize < 500 * 1024) { // Small file + screen ratio = suspicious
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate suspicion score for the photo (0-100, higher = more suspicious)
   */
  calculateSuspicionScore(): number {
    let score = 0;

    // No camera info is very suspicious
    if (!this._hasCameraInfo) {
      score += 40;
    }

    // Very small file size for a photo is suspicious
    if (this._fileSize < 200 * 1024) { // Less than 200KB
      score += 20;
    }

    // Very large file size might indicate unprocessed/raw image
    if (this._fileSize > 10 * 1024 * 1024) { // More than 10MB
      score += 10;
    }

    // Check dimensions if available
    if (this._dimensions) {
      const totalPixels = this._dimensions.width * this._dimensions.height;
      
      // Very low resolution
      if (totalPixels < 640 * 480) {
        score += 15;
      }

      // Unusual aspect ratios (might be cropped screenshot)
      const aspectRatio = this._dimensions.width / this._dimensions.height;
      if (aspectRatio < 0.5 || aspectRatio > 3) {
        score += 10;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Validate that photo timestamp matches record time within tolerance
   */
  validateTimestamp(recordTime: Date, toleranceMinutes: number = 2): boolean {
    return this.isTakenRecently(recordTime, toleranceMinutes);
  }

  equals(other: PhotoMetadata): boolean {
    return this._timestamp.getTime() === other._timestamp.getTime() &&
           this._hasCameraInfo === other._hasCameraInfo &&
           this._fileSize === other._fileSize;
  }

  toString(): string {
    return `PhotoMetadata(${this._timestamp.toISOString()}, ${this._fileSize} bytes, camera: ${this._hasCameraInfo})`;
  }

  toJSON() {
    return {
      timestamp: this._timestamp.toISOString(),
      hasCameraInfo: this._hasCameraInfo,
      fileSize: this._fileSize,
      dimensions: this._dimensions,
      cameraInfo: this._cameraInfo,
      originalPath: this._originalPath,
    };
  }
}
