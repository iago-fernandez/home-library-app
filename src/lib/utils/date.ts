export function formatDate(dateString: string | undefined | null, format: string, locale: string = 'en'): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const pad = (n: number) => n.toString().padStart(2, '0');
    
    // Pure dates from DB arrive as 'YYYY-MM-DD' (no 'T', length 10).
    // The Date constructor parses these as midnight UTC.
    // To prevent local timezone shifting the date to the previous day, we must use getUTC* methods.
    const isPureDate = !dateString.includes('T');

    const yearRaw = isPureDate ? date.getUTCFullYear() : date.getFullYear();
    const monthRaw = isPureDate ? date.getUTCMonth() + 1 : date.getMonth() + 1;
    const dayRaw = isPureDate ? date.getUTCDate() : date.getDate();
    
    const year = yearRaw;
    const month = pad(monthRaw);
    const day = pad(dayRaw);
    
    const hours = isPureDate ? '00' : pad(date.getHours());
    const minutes = isPureDate ? '00' : pad(date.getMinutes());
    const seconds = isPureDate ? '00' : pad(date.getSeconds());

    // Strip time portion from format if the input is a pure date
    let actualFormat = format;
    if (isPureDate) {
        actualFormat = actualFormat.replace(' hh:mm:ss', '').trim();
    }

    switch (actualFormat) {
        case 'dd/mm/yyyy hh:mm:ss':
            return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        case 'dd/mm/yyyy':
            return `${day}/${month}/${year}`;
        case 'mm/dd/yyyy hh:mm:ss':
            return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
        case 'mm/dd/yyyy':
            return `${month}/${day}/${year}`;
        case 'yyyy-mm-dd hh:mm:ss':
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        case 'yyyy-mm-dd':
            return `${year}-${month}-${day}`;
        default:
            return isPureDate 
                ? `${day}/${month}/${year}` 
                : `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    }
}
