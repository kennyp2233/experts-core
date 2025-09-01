export class WorkShift {
  constructor(
    private readonly _date: Date,
    private readonly _entryTime: Date | null,
    private readonly _exitTime: Date | null,
    private readonly _totalHours: number | null,
    private readonly _isComplete: boolean,
  ) {
    this.validateShift();
  }

  static create(
    date: Date,
    entryTime: Date | null = null,
    exitTime: Date | null = null,
  ): WorkShift {
    const totalHours = WorkShift.calculateTotalHours(entryTime, exitTime);
    const isComplete = entryTime !== null && exitTime !== null;
    
    return new WorkShift(date, entryTime, exitTime, totalHours, isComplete);
  }

  static createFromDates(date: Date, entryTime?: Date, exitTime?: Date): WorkShift {
    return WorkShift.create(date, entryTime || null, exitTime || null);
  }

  private validateShift(): void {
    // Normalize date to start of day
    const shiftDate = new Date(this._date);
    shiftDate.setHours(0, 0, 0, 0);

    if (this._entryTime && this._exitTime) {
      if (this._exitTime <= this._entryTime) {
        // Allow overnight shifts
        const nextDay = new Date(this._entryTime);
        nextDay.setDate(nextDay.getDate() + 1);
        
        if (this._exitTime > nextDay) {
          throw new Error('Exit time cannot be more than 24 hours after entry time');
        }
      }

      const calculatedHours = WorkShift.calculateTotalHours(this._entryTime, this._exitTime);
      if (calculatedHours !== null && calculatedHours > 24) {
        throw new Error('Work shift cannot exceed 24 hours');
      }
    }
  }

  private static calculateTotalHours(entryTime: Date | null, exitTime: Date | null): number | null {
    if (!entryTime || !exitTime) {
      return null;
    }

    let diffMs = exitTime.getTime() - entryTime.getTime();
    
    // Handle overnight shifts
    if (diffMs < 0) {
      diffMs += 24 * 60 * 60 * 1000; // Add 24 hours
    }

    return diffMs / (1000 * 60 * 60); // Convert to hours
  }

  get date(): Date {
    return this._date;
  }

  get entryTime(): Date | null {
    return this._entryTime;
  }

  get exitTime(): Date | null {
    return this._exitTime;
  }

  get totalHours(): number | null {
    return this._totalHours;
  }

  get isComplete(): boolean {
    return this._isComplete;
  }

  /**
   * Add entry time to the shift
   */
  withEntry(entryTime: Date): WorkShift {
    if (this._entryTime) {
      throw new Error('Shift already has an entry time');
    }

    return WorkShift.create(this._date, entryTime, this._exitTime);
  }

  /**
   * Add exit time to the shift
   */
  withExit(exitTime: Date): WorkShift {
    if (!this._entryTime) {
      throw new Error('Cannot add exit time without entry time');
    }

    if (this._exitTime) {
      throw new Error('Shift already has an exit time');
    }

    return WorkShift.create(this._date, this._entryTime, exitTime);
  }

  /**
   * Check if the shift is currently active (has entry but no exit)
   */
  isActive(): boolean {
    return this._entryTime !== null && this._exitTime === null;
  }

  /**
   * Check if shift is incomplete (missing either entry or exit)
   */
  isIncomplete(): boolean {
    return !this._isComplete;
  }

  /**
   * Check if shift exceeds normal working hours (8+ hours)
   */
  isLongShift(maxNormalHours: number = 8): boolean {
    return this._totalHours !== null && this._totalHours > maxNormalHours;
  }

  /**
   * Check if shift is suspiciously short
   */
  isShortShift(minNormalHours: number = 4): boolean {
    return this._totalHours !== null && this._totalHours < minNormalHours;
  }

  /**
   * Check if entry time is within normal working hours
   */
  hasNormalEntryTime(earliestHour: number = 6, latestHour: number = 10): boolean {
    if (!this._entryTime) return false;
    
    const entryHour = this._entryTime.getHours();
    return entryHour >= earliestHour && entryHour <= latestHour;
  }

  /**
   * Check if exit time is within normal working hours
   */
  hasNormalExitTime(earliestHour: number = 14, latestHour: number = 20): boolean {
    if (!this._exitTime) return false;
    
    const exitHour = this._exitTime.getHours();
    return exitHour >= earliestHour && exitHour <= latestHour;
  }

  /**
   * Get shift duration in different units
   */
  getDuration(): {
    hours: number | null;
    minutes: number | null;
    seconds: number | null;
  } {
    if (!this._totalHours) {
      return { hours: null, minutes: null, seconds: null };
    }

    const hours = Math.floor(this._totalHours);
    const minutes = Math.floor((this._totalHours - hours) * 60);
    const seconds = Math.floor(((this._totalHours - hours) * 60 - minutes) * 60);

    return { hours, minutes, seconds };
  }

  /**
   * Format shift for display
   */
  formatShift(): string {
    const dateStr = this._date.toISOString().split('T')[0];
    const entryStr = this._entryTime ? this._entryTime.toLocaleTimeString() : 'No entry';
    const exitStr = this._exitTime ? this._exitTime.toLocaleTimeString() : 'No exit';
    const hoursStr = this._totalHours ? `${this._totalHours.toFixed(2)}h` : 'N/A';
    
    return `${dateStr}: ${entryStr} - ${exitStr} (${hoursStr})`;
  }

  equals(other: WorkShift): boolean {
    return this._date.getTime() === other._date.getTime() &&
           this._entryTime?.getTime() === other._entryTime?.getTime() &&
           this._exitTime?.getTime() === other._exitTime?.getTime();
  }

  toString(): string {
    return this.formatShift();
  }

  toJSON() {
    return {
      date: this._date.toISOString().split('T')[0],
      entryTime: this._entryTime?.toISOString() || null,
      exitTime: this._exitTime?.toISOString() || null,
      totalHours: this._totalHours,
      isComplete: this._isComplete,
    };
  }
}
