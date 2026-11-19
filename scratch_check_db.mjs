import './backend/src/config/db.js';
import User from './backend/src/models/User.js';
import Lecturer from './backend/src/models/Lecturer.js';
import Internship from './backend/src/models/Internship.js';
import InternshipDocument from './backend/src/models/InternshipDocument.js';
import AcademicTerm from './backend/src/models/AcademicTerm.js';

setTimeout(async () => {
  try {
    const users = await User.find({ role: { $in: ['TBM', 'LECTURER'] } }).select('_id fullName email role');
    console.log('USERS:', users);

    const lecturers = await Lecturer.find().select('_id userId department').populate('userId', 'fullName email role');
    console.log('LECTURERS:', lecturers.map(l => ({ id: l._id, userId: l.userId?._id, name: l.userId?.fullName, role: l.userId?.role })));

    const terms = await AcademicTerm.find().select('_id termName code status');
    console.log('TERMS:', terms);

    const internships = await Internship.find().select('_id studentId lecturerId academicTermId status reportFile');
    console.log('INTERNSHIPS count:', internships.length, internships);

    const docs = await InternshipDocument.find({ documentType: 'SUBMISSION' }).select('_id title fileName category supervisorId internshipId academicTermId status');
    console.log('DOCS count:', docs.length, docs);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}, 1000);
