export interface SlotData {
  date: string;        // "2026-03-05"
  timeSlot: string;    // "14:35"
  total: number;       // Cumulative total count
}

/**
 * Parse Google Sheets data and calculate cumulative totals by 5-minute slots
 * Expected columns: A=Activitytimestamp, B=PurchaserName, C=CouponDate, D=Name, E=classification
 */
export const parseGoogleSheetsData = (rows: any[][]): SlotData[] => {
  if (!rows || rows.length <= 1) return [];

  // Skip header row (row 0)
  const records = rows.slice(1).map((row, index) => {
    const activityTimestamp = row[0]; // "2026-03-05 21:13:57"

    if (!activityTimestamp || activityTimestamp.trim() === '') {
      return null;
    }

    try {
      const parts = activityTimestamp.split(' ');
      if (parts.length !== 2) {
        return null;
      }

      const [datePart, timePart] = parts;
      const dateComponents = datePart.split('-');
      const timeComponents = timePart.split(':');

      if (dateComponents.length !== 3 || timeComponents.length !== 3) {
        return null;
      }

      const year = parseInt(dateComponents[0]);
      const month = parseInt(dateComponents[1]);
      const day = parseInt(dateComponents[2]);
      const hour = parseInt(timeComponents[0]);
      const minute = parseInt(timeComponents[1]);
      const second = parseInt(timeComponents[2]);

      // Validate date values
      if (isNaN(year) || isNaN(month) || isNaN(day) ||
          isNaN(hour) || isNaN(minute) || isNaN(second)) {
        return null;
      }

      // Validate ranges
      if (month < 1 || month > 12 || day < 1 || day > 31 ||
          hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
        return null;
      }

      const timestamp = new Date(year, month - 1, day, hour, minute, second).toISOString();

      // Calculate 5-minute time slot
      const slotMinutes = Math.floor(minute / 5) * 5;
      const timeSlot = `${hour.toString().padStart(2, '0')}:${slotMinutes.toString().padStart(2, '0')}`;

      return {
        timestamp,
        date: datePart, // "2026-03-05"
        timeSlot      // "14:35"
      };
    } catch (error) {
      console.log(`Skipping row ${index + 1}: parse error "${activityTimestamp}"`, error);
      return null;
    }
  }).filter(Boolean); // Remove null entries

  // Calculate cumulative totals by slot
  const slotMap = new Map<string, number>();

  // Sort by timestamp
  const sortedRecords = records.sort((a: any, b: any) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  sortedRecords.forEach((record: any) => {
    const key = `${record.date}_${record.timeSlot}`;

    // Count all records up to this slot
    let cumulative = 0;
    sortedRecords.forEach((r: any) => {
      if (r.date === record.date && r.timeSlot <= record.timeSlot) {
        cumulative++;
      }
    });

    slotMap.set(key, {
      date: record.date,
      timeSlot: record.timeSlot,
      total: cumulative
    });
  });

  // Return unique slots sorted by date and time
  const result = Array.from(slotMap.values())
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.timeSlot.localeCompare(b.timeSlot);
    });

  console.log(`Parsed ${result.length} slot data points from Google Sheets`);
  return result;
};

/**
 * Generate 5-minute slot labels between start and end time
 * Includes all slots (all data points must have labels)
 * Hours wrap around after 23 (23:59 -> 00:00)
 */
export const generateSlotLabels = (startSlot: string, endSlot: string) => {
  const labels = [];
  let [startHours, startMinutes] = startSlot.split(':').map(Number);
  let [endHours, endMinutes] = endSlot.split(':').map(Number);

  let currentMinutes = startHours * 60 + startMinutes;
  const endMinutesTotal = endHours * 60 + endMinutes;

  while (currentMinutes <= endMinutesTotal) {
    const totalMinutesInDay = 24 * 60; // 1440 minutes in a day
    const wrappedMinutes = currentMinutes % totalMinutesInDay;
    const hours = Math.floor(wrappedMinutes / 60);
    const minutes = wrappedMinutes % 60;
    const slotLabel = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    labels.push(slotLabel);
    currentMinutes += 5;
  }

  return labels;
};
