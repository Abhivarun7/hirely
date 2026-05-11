export function generateICSInterviewInvite(interview: {
  interview_date: Date;
  format: 'video' | 'phone' | 'in_person';
  location_or_link?: string;
  notes?: string;
  seekerEmail?: string;
  seekerName?: string;
  companyName?: string;
  jobTitle?: string;
}): string {
  const {
    interview_date,
    format,
    location_or_link,
    seekerEmail,
    seekerName,
    companyName,
    jobTitle,
  } = interview;

  const startDate = new Date(interview_date);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const uid = `${Date.now()}-hirely-interview@hirely.com`;
  const summary = `Interview${jobTitle ? ` - ${jobTitle}` : ''}`;
  const description = `Interview${companyName ? ` at ${companyName}` : ''}${jobTitle ? ` for ${jobTitle}` : ''}${interview.notes ? `\n\nNotes: ${interview.notes}` : ''}`;

  let location = '';
  if (format === 'video' && location_or_link) {
    location = location_or_link;
  } else if (format === 'in_person' && location_or_link) {
    location = location_or_link;
  }

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Hirely//Interview//EN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${summary}
DESCRIPTION:${description}
LOCATION:${location}
BEGIN:VALARM
TRIGGER:-PT30M
ACTION:DISPLAY
DESCRIPTION:Interview Reminder
END:VALARM
END:VEVENT
END:VCALENDAR`;

  return ics;
}