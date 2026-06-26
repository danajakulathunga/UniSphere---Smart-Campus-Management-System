import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateBookingPDF = (bookings) => {
  const doc = new jsPDF();

  // Header section
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text("UniSphere Smart Campus Management System", 14, 22);

  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text("System Bookings Report", 14, 32);

  doc.setFontSize(10);
  doc.text(`Total Bookings: ${bookings.length}`, 14, 38);
  doc.text(`Date: ${new Date().toLocaleString()}`, 14, 44);

  // Table Data
  const tableColumn = ["#", "Resource", "User", "Date", "Time Slot", "Purpose", "Status"];
  const tableRows = bookings.map((booking, index) => [
    index + 1,
    booking.resourceName,
    booking.userName,
    booking.bookingDate,
    `${booking.startTime.substring(0, 5)} - ${booking.endTime.substring(0, 5)}`,
    booking.purpose,
    booking.status
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 50,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 0: { cellWidth: 8 } },
    margin: { top: 45 }
  });

  doc.save(`bookings_report_${new Date().getTime()}.pdf`);
};

export const generateTicketPDF = (tickets) => {
  const doc = new jsPDF();

  // Header section
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text("UniSphere Smart Campus Management System", 14, 22);

  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text("Service Tickets Report", 14, 32);

  doc.setFontSize(10);
  doc.text(`Total Tickets: ${tickets.length}`, 14, 38);
  doc.text(`Date: ${new Date().toLocaleString()}`, 14, 44);

  // Table Data
  const tableColumn = ["#", "ID", "Title", "Category", "Priority", "Location", "Created By", "Technician", "Status"];
  const tableRows = tickets.map((ticket, index) => [
    index + 1,
    `#${ticket.id.substring(0, 8)}`,
    ticket.title,
    ticket.category,
    ticket.priority,
    ticket.location,
    ticket.userName,
    ticket.assignedTechnicianName || "Unassigned",
    ticket.status
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 50,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold'
    },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 0: { cellWidth: 8 } },
    margin: { top: 45 }
  });

  doc.save(`tickets_report_${new Date().getTime()}.pdf`);
};

export const generateUserPDF = (users) => {
  const doc = new jsPDF();

  // Header section
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text("UniSphere Smart Campus Management System", 14, 22);

  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text("Student Details Report", 14, 32);

  doc.setFontSize(10);
  doc.text(`Total Students: ${users.length}`, 14, 38);
  doc.text(`Date: ${new Date().toLocaleString()}`, 14, 44);

  // Table Data
  const tableColumn = ["#", "Name", "Email", "Roles", "Status", "Joined Date"];
  const tableRows = users.map((user, index) => [
    index + 1,
    user.name,
    user.email,
    user.roles.join(', '),
    user.enabled ? "Active" : "Disabled",
    user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 50,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 0: { cellWidth: 8 } },
    margin: { top: 45 }
  });

  doc.save(`users_report_${new Date().getTime()}.pdf`);
};

export const generateLecturerStudentPDF = (students) => {
  const doc = new jsPDF();

  // Header section
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text("UniSphere Smart Campus Management System", 14, 22);

  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text("Assigned Students Report", 14, 32);

  doc.setFontSize(10);
  doc.text(`Total Students: ${students.length}`, 14, 38);
  doc.text(`Date: ${new Date().toLocaleString()}`, 14, 44);

  // Table Data
  const tableColumn = ["#", "Name", "Email", "Batch", "Semester"];
  const tableRows = students.map((user, index) => {
    // Convert "1st Year" to "Y1" and "Semester 1" to "S1" for compact view if needed, 
    // but the requirement says "Batch (e.g. Y3) Semester (e.g. S1)".
    // Let's format them.
    const yMatch = user.year ? user.year.match(/\d/) : null;
    const sMatch = user.semester ? user.semester.match(/\d/) : null;
    const batchStr = yMatch ? `Y${yMatch[0]}` : user.year || 'N/A';
    const semStr = sMatch ? `S${sMatch[0]}` : user.semester || 'N/A';

    return [
      index + 1,
      user.name,
      user.email,
      batchStr,
      semStr
    ];
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 50,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 0: { cellWidth: 8 } },
    margin: { top: 45 }
  });

  doc.save(`assigned_students_report_${new Date().getTime()}.pdf`);
};

export const generateResourcePDF = (resources) => {
  const doc = new jsPDF();

  // Header section
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text("UniSphere Smart Campus Management System", 14, 22);

  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text("Campus Facilities Report", 14, 32);

  doc.setFontSize(10);
  doc.text(`Total Facilities: ${resources.length}`, 14, 38);
  doc.text(`Date: ${new Date().toLocaleString()}`, 14, 44);

  // Table Data
  const tableColumn = ["#", "Name", "Type", "Capacity", "Location", "Availability"];
  const tableRows = resources.map((resource, index) => [
    index + 1,
    resource.name,
    resource.type,
    resource.capacity,
    resource.location,
    resource.availability ? "Available" : "Unavailable"
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 50,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 0: { cellWidth: 8 } },
    margin: { top: 45 }
  });

  doc.save(`facilities_report_${new Date().getTime()}.pdf`);
};

export const generateStaffPDF = (staff) => {
  const doc = new jsPDF();

  // Header section
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text("UniSphere Smart Campus Management System", 14, 22);

  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text("Staff Member Details Report", 14, 32);

  doc.setFontSize(10);
  doc.text(`Total Staff Members: ${staff.length}`, 14, 38);
  doc.text(`Date: ${new Date().toLocaleString()}`, 14, 44);

  // Table Data
  const tableColumn = ["#", "Name", "System Email", "Role", "Status", "Joined Date"];
  const tableRows = staff.map((member, index) => [
    index + 1,
    member.name,
    member.email,
    member.roles.join(', '),
    member.enabled ? "Active" : "Disabled",
    member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 50,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 0: { cellWidth: 8 } },
    margin: { top: 45 }
  });

  doc.save(`staff_report_${new Date().getTime()}.pdf`);
};

export const generateAttendancePDF = (session, attendanceList, summary) => {
  const doc = new jsPDF();

  // Header section
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text("UniSphere Smart Campus Management System", 14, 22);

  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text("Lecture Session Attendance Report", 14, 32);

  // Lecture Details
  doc.setFontSize(11);
  doc.setTextColor(50);
  doc.text(`Lecture Title: ${session.purpose}`, 14, 42);
  doc.text(`Lecturer: Dr. ${session.userName}`, 14, 48);
  doc.text(`Date: ${session.bookingDate}`, 14, 54);
  doc.text(`Time: ${session.startTime} - ${session.endTime}`, 14, 60);

  // Attendance Summary
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text("Attendance Summary", 14, 70);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Total Shared Students: ${summary.totalSharedStudents}`, 14, 78);
  doc.text(`Attended Students: ${summary.attendedStudents}`, 14, 84);
  doc.text(`Attendance Percentage: ${summary.attendancePercentage}%`, 14, 90);

  // Table Data
  const tableColumn = ["#", "Name", "Email", "Date", "Time"];
  const tableRows = attendanceList.map((record, index) => [
    index + 1,
    record.studentName,
    record.studentEmail,
    record.submittedDate,
    record.submittedTime
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 96,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 0: { cellWidth: 8 } },
    margin: { top: 90 }
  });

  doc.save(`attendance_report_${session.purpose.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
};

export const generateSessionsPDF = (sessions, filterContext = {}) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235);
  doc.text("UniSphere Smart Campus Management System", 14, 22);

  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text("Lecture Sessions Schedule Report", 14, 32);

  doc.setFontSize(10);
  doc.setTextColor(60);
  let yPos = 40;
  doc.text(`Total Sessions: ${sessions.length}`, 14, yPos);
  yPos += 6;
  if (filterContext.status) {
    doc.text(`Status Filter: ${filterContext.status}`, 14, yPos);
    yPos += 6;
  }
  if (filterContext.lecturer) {
    doc.text(`Lecturer Filter: ${filterContext.lecturer}`, 14, yPos);
    yPos += 6;
  }
  if (filterContext.batch) {
    doc.text(`Batch Filter: ${filterContext.batch}`, 14, yPos);
    yPos += 6;
  }
  if (filterContext.date) {
    doc.text(`Date Filter: ${filterContext.date}`, 14, yPos);
    yPos += 6;
  }
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPos);

  const startY = yPos + 8;

  const tableColumn = ["#", "Title", "Lecturer", "Date", "Time", "Location", "Batch", "Status"];
  const tableRows = sessions.map((s, index) => {
    const dateStr = Array.isArray(s.bookingDate)
      ? `${s.bookingDate[0]}-${String(s.bookingDate[1]).padStart(2,'0')}-${String(s.bookingDate[2]).padStart(2,'0')}`
      : (s.bookingDate || "");
    const startStr = Array.isArray(s.startTime)
      ? `${String(s.startTime[0]).padStart(2,'0')}:${String(s.startTime[1]).padStart(2,'0')}`
      : (s.startTime ? s.startTime.substring(0, 5) : "");
    const endStr = Array.isArray(s.endTime)
      ? `${String(s.endTime[0]).padStart(2,'0')}:${String(s.endTime[1]).padStart(2,'0')}`
      : (s.endTime ? s.endTime.substring(0, 5) : "");

    let status = "Scheduled";
    if (s.status === "CANCELLED") status = "Cancelled";
    else if (s.isUpdated) status = "Updated";

    return [
      index + 1,
      s.purpose || "",
      s.userName || "",
      dateStr,
      startStr && endStr ? `${startStr} - ${endStr}` : "",
      s.resourceName || "",
      s.assignedBatch || "General",
      status,
    ];
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 0: { cellWidth: 8 } },
  });

  doc.save(`sessions_schedule_${new Date().getTime()}.pdf`);
};
