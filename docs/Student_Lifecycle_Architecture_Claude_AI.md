# MASTER STUDENT INFORMATION ARCHITECTURE
## Islamic Boarding School — SMA Berasrama
### Claude AI Ready Specification

> Versi: 1.0  
> Tujuan: menjadi blueprint domain, modul, data, relasi, workflow, RBAC, dan kebutuhan pengembangan sistem Student Information & Boarding Management System.

---

## 1. VISION

Sistem harus membangun **Student 360° / Single Source of Truth**.

Satu `student_id` menjadi identitas utama yang menghubungkan seluruh perjalanan peserta didik:

Admission
→ Student Master
→ Academic
→ Boarding
→ Islamic Development
→ Student Life
→ Finance
→ Graduation
→ Alumni

Prinsip utama:
1. Jangan menggandakan master data siswa pada setiap modul.
2. Setiap transaksi/riwayat menggunakan `student_id`.
3. Data historis tidak boleh ditimpa; gunakan history/event record.
4. Pisahkan master data, transaksi, dan laporan.
5. Gunakan RBAC dan least privilege.
6. Data sensitif wajib memiliki akses terbatas dan audit log.
7. Semua perubahan penting harus dapat ditelusuri.
8. Sistem harus mendukung SMA kelas 10–12 dan dapat diperluas menjadi SMP–SMA kelas 7–12.

---

# 2. DOMAIN MAP

## 2.1 Admission
Mengelola calon siswa sejak pendaftaran sampai resmi menjadi siswa.

Subdomain:
- Admission Period
- Applicant
- Registration
- Parent/Guardian
- Documents
- Selection
- Assessment
- Interview
- Admission Decision
- Re-registration
- Student Conversion

## 2.2 Student Master
Master profile dan identitas resmi siswa.

Subdomain:
- Student Profile
- Family
- Guardian
- Address
- Identity Documents
- Emergency Contact
- Student Status
- Status History
- Consent
- Student Tags

## 2.3 Academic
Mengelola proses akademik.

Subdomain:
- Academic Year
- Semester
- Grade
- Class
- Homeroom
- Curriculum
- Subject
- Teacher
- Student Enrollment
- Schedule
- Attendance
- Assessment
- Grade
- Report Card
- Promotion
- Transfer

## 2.4 Boarding
Mengelola kehidupan asrama.

Subdomain:
- Dormitory
- Building
- Floor
- Room
- Bed
- Room Assignment
- Dorm Mentor
- Dorm Attendance
- Leave Permission
- Return Monitoring
- Dorm Activity
- Dorm Incident

## 2.5 Islamic Development
Mengelola perkembangan keislaman dan kepesantrenan.

Subdomain:
- Diniyah
- Qur'an
- Tahfiz
- Tilawah
- Hadith
- Fiqh
- Aqidah
- Akhlaq
- Arabic
- Worship Program
- Islamic Character
- Spiritual Development

## 2.6 Student Life
Mengelola pembinaan siswa di luar akademik.

Subdomain:
- Discipline
- Counseling
- Achievement
- Extracurricular
- Organization
- Leadership
- Community Service
- Character Development
- Student Activities

## 2.7 Finance
Mengelola kewajiban dan transaksi keuangan siswa.

Subdomain:
- Fee Structure
- Billing Account
- Invoice
- Payment
- Scholarship
- Discount
- Waiver
- Refund
- Arrears
- Financial Statement

## 2.8 Graduation
Mengelola kelulusan dan penyelesaian pendidikan.

Subdomain:
- Graduation Eligibility
- Graduation Requirement
- Final Assessment
- Clearance
- Graduation Decision
- Certificate
- Transcript
- Graduation Event

## 2.9 Alumni
Mengelola hubungan setelah lulus.

Subdomain:
- Alumni Profile
- Graduation Cohort
- Higher Education
- Employment
- Achievement
- Contact Update
- Alumni Activities
- Tracer Study

---

# 3. CORE ENTITY MODEL

## 3.1 Person

Person adalah entitas dasar untuk manusia yang berinteraksi dengan sistem.

Fields:
- person_id
- full_name
- preferred_name
- gender
- birth_place
- birth_date
- nationality
- religion
- phone
- email
- photo_url
- created_at
- updated_at

Catatan:
Student, Parent, Guardian, Teacher, Staff, Mentor dapat menggunakan konsep Person.

## 3.2 Student

Fields:
- student_id
- student_number
- nis
- nisn
- person_id
- admission_id
- enrollment_date
- entry_grade
- current_grade
- current_class_id
- current_status
- graduation_year
- exit_date
- exit_reason
- created_at
- updated_at

Status:
- applicant
- admitted
- enrolled
- active
- leave
- transferred
- graduated
- withdrawn
- expelled
- deceased

## 3.3 Student Status History

Fields:
- status_history_id
- student_id
- previous_status
- new_status
- effective_date
- reason
- reference_document
- approved_by
- created_at

---

# 4. ADMISSION MODULE

## 4.1 Admission Period

Fields:
- admission_period_id
- academic_year_id
- name
- start_date
- end_date
- target_grade
- quota
- registration_fee
- status

## 4.2 Applicant

Fields:
- applicant_id
- registration_number
- admission_period_id
- person_id
- previous_school
- previous_grade
- application_date
- application_status
- source
- notes

Status:
- draft
- submitted
- verified
- selected
- rejected
- waitlisted
- admitted
- withdrawn

## 4.3 Applicant Documents

Fields:
- document_id
- applicant_id
- document_type
- file_url
- document_number
- issue_date
- expiry_date
- verification_status
- verified_by
- verified_at

## 4.4 Selection

Fields:
- selection_id
- applicant_id
- selection_type
- selection_date
- score
- evaluator
- result
- notes

Selection types:
- academic
- religious
- psychological
- interview
- health
- administrative

## 4.5 Admission Decision

Fields:
- decision_id
- applicant_id
- decision
- decision_date
- decision_by
- notes

## 4.6 Enrollment Conversion

Ketika applicant diterima dan daftar ulang:

Applicant
→ Admission
→ Student

Wajib mempertahankan relasi historis.

---

# 5. STUDENT MASTER

## 5.1 Identity

Fields:
- student_id
- full_name
- nickname
- NIS
- NISN
- NIK
- gender
- birth_place
- birth_date
- religion
- nationality
- blood_type
- photo

## 5.2 Address

Fields:
- address_id
- student_id
- address_type
- address_line
- village
- district
- regency
- province
- postal_code
- is_primary

Address types:
- family
- domicile
- guardian
- emergency

## 5.3 Parent

Fields:
- parent_id
- person_id
- occupation
- education
- workplace
- income_range
- phone
- email

## 5.4 Student Parent Relationship

Fields:
- relationship_id
- student_id
- parent_id
- relationship_type
- is_primary
- custody_status
- emergency_contact

## 5.5 Emergency Contact

Fields:
- emergency_contact_id
- student_id
- person_name
- relationship
- phone
- address
- priority

## 5.6 Student Documents

Document types:
- birth_certificate
- family_card
- identity_card
- previous_school_certificate
- report_card
- health_document
- achievement_certificate
- other

---

# 6. ACADEMIC MODULE

## 6.1 Academic Year

Fields:
- academic_year_id
- name
- start_date
- end_date
- status

## 6.2 Semester

Fields:
- semester_id
- academic_year_id
- name
- start_date
- end_date
- status

## 6.3 Grade

Fields:
- grade_id
- name
- level
- sequence

Contoh:
- Grade 10
- Grade 11
- Grade 12

## 6.4 Class

Fields:
- class_id
- academic_year_id
- grade_id
- class_name
- homeroom_teacher_id
- capacity
- status

## 6.5 Subject

Fields:
- subject_id
- code
- name
- category
- curriculum
- credit
- active

Kategori:
- national
- school
- Islamic
- language
- boarding
- elective

## 6.6 Student Enrollment

Fields:
- enrollment_id
- student_id
- academic_year_id
- grade_id
- class_id
- enrollment_date
- status

## 6.7 Schedule

Fields:
- schedule_id
- academic_year_id
- semester_id
- class_id
- subject_id
- teacher_id
- day
- start_time
- end_time
- room

## 6.8 Attendance

Fields:
- attendance_id
- student_id
- schedule_id
- attendance_date
- status
- check_in
- check_out
- note
- recorded_by

Status:
- present
- late
- sick
- excused
- absent

## 6.9 Assessment

Fields:
- assessment_id
- subject_id
- class_id
- teacher_id
- assessment_type
- assessment_date
- title
- weight

## 6.10 Grade

Fields:
- grade_record_id
- assessment_id
- student_id
- score
- grade
- teacher_note

## 6.11 Report Card

Fields:
- report_card_id
- student_id
- academic_year_id
- semester_id
- final_average
- attendance_summary
- homeroom_note
- rank_if_used
- status
- published_at

---

# 7. BOARDING MODULE

## 7.1 Dormitory

Fields:
- dormitory_id
- name
- gender
- building
- capacity
- supervisor_id
- status

## 7.2 Room

Fields:
- room_id
- dormitory_id
- floor
- room_number
- capacity
- status

## 7.3 Bed

Fields:
- bed_id
- room_id
- bed_number
- status

## 7.4 Room Assignment

Fields:
- assignment_id
- student_id
- room_id
- bed_id
- mentor_id
- start_date
- end_date
- status
- assignment_reason

## 7.5 Dorm Attendance

Fields:
- dorm_attendance_id
- student_id
- dormitory_activity_id
- attendance_date
- status
- recorded_by

## 7.6 Leave Permission

Fields:
- leave_id
- student_id
- leave_type
- request_date
- departure_date
- departure_time
- expected_return_date
- expected_return_time
- actual_return_date
- actual_return_time
- destination
- reason
- pickup_person
- pickup_relationship
- approval_status
- approved_by

Types:
- home_leave
- medical
- family
- school
- emergency
- other

## 7.7 Late Return

Fields:
- late_return_id
- leave_id
- actual_return_time
- delay_minutes
- reason
- action_taken

---

# 8. ISLAMIC DEVELOPMENT MODULE

## 8.1 Islamic Subject

Fields:
- islamic_subject_id
- name
- category
- level
- teacher_id

Examples:
- Qur'an
- Tahfiz
- Hadith
- Fiqh
- Aqidah
- Akhlaq
- Sejarah Islam
- Bahasa Arab

## 8.2 Tahfiz Target

Fields:
- tahfiz_target_id
- student_id
- academic_year_id
- target_juz
- target_surah
- target_date
- mentor_id

## 8.3 Tahfiz Record

Fields:
- tahfiz_record_id
- student_id
- mentor_id
- date
- surah
- ayat_from
- ayat_to
- type
- score
- quality
- notes

Types:
- new_memorization
- murajaah
- tasmi
- correction

## 8.4 Islamic Assessment

Fields:
- assessment_id
- student_id
- subject_id
- assessment_date
- score
- grade
- note
- assessor

## 8.5 Worship / Religious Activity

Fields:
- activity_id
- name
- category
- schedule
- supervisor

Examples:
- congregational prayer
- Qur'an recitation
- morning/evening adhkar
- sermon
- halaqah

---

# 9. STUDENT LIFE MODULE

## 9.1 Discipline

Fields:
- incident_id
- student_id
- incident_date
- category
- severity
- description
- points
- location
- reported_by
- action
- status
- resolved_by
- resolved_at

Severity:
- minor
- moderate
- major
- critical

## 9.2 Counseling

Fields:
- counseling_id
- student_id
- counselor_id
- date
- category
- reason
- summary
- recommendation
- follow_up_date
- status

Access must be restricted.

## 9.3 Achievement

Fields:
- achievement_id
- student_id
- date
- category
- title
- level
- organizer
- result
- certificate_url
- description

Levels:
- school
- district
- regency
- provincial
- national
- international

## 9.4 Extracurricular

Master:
- extracurricular_id
- name
- category
- coach
- schedule
- capacity

Enrollment:
- extracurricular_enrollment_id
- student_id
- extracurricular_id
- academic_year_id
- position
- status

## 9.5 Organization

Fields:
- organization_id
- name
- type

Membership:
- membership_id
- student_id
- organization_id
- academic_year_id
- position
- start_date
- end_date

---

# 10. FINANCE MODULE

## 10.1 Fee Structure

Fields:
- fee_structure_id
- academic_year_id
- grade_id
- fee_type
- amount
- frequency
- due_day
- active

Fee types:
- registration
- tuition
- boarding
- meals
- uniform
- books
- activities
- other

## 10.2 Student Billing Account

Fields:
- billing_account_id
- student_id
- account_number
- balance
- status

## 10.3 Invoice

Fields:
- invoice_id
- billing_account_id
- invoice_number
- fee_type
- billing_period
- amount
- discount
- final_amount
- due_date
- status

## 10.4 Payment

Fields:
- payment_id
- invoice_id
- payment_number
- payment_date
- amount
- payment_method
- reference_number
- received_by

## 10.5 Scholarship

Fields:
- scholarship_id
- student_id
- type
- percentage_or_amount
- start_date
- end_date
- reason
- approved_by
- status

---

# 11. GRADUATION MODULE

## 11.1 Graduation Requirement

Master requirements:
- academic_completion
- minimum_attendance
- financial_clearance
- library_clearance
- dormitory_clearance
- disciplinary_clearance
- document_completion
- Islamic_program_completion

## 11.2 Graduation Eligibility

Fields:
- eligibility_id
- student_id
- academic_year_id
- eligible
- academic_status
- financial_status
- boarding_status
- disciplinary_status
- document_status
- reviewed_by
- reviewed_at

## 11.3 Clearance

Fields:
- clearance_id
- student_id
- department
- status
- outstanding_amount
- notes
- approved_by

Departments:
- academic
- finance
- library
- boarding
- administration
- student_affairs

## 11.4 Graduation Decision

Fields:
- graduation_decision_id
- student_id
- decision
- decision_date
- approved_by
- notes

---

# 12. ALUMNI MODULE

## 12.1 Alumni Profile

Fields:
- alumni_id
- student_id
- graduation_year
- graduation_class
- current_city
- current_country
- phone
- email
- social_media
- privacy_preference

## 12.2 Higher Education

Fields:
- education_id
- alumni_id
- institution
- faculty
- major
- degree
- start_year
- graduation_year
- status

## 12.3 Employment

Fields:
- employment_id
- alumni_id
- company
- position
- industry
- start_date
- end_date
- current

## 12.4 Alumni Achievement

Fields:
- achievement_id
- alumni_id
- date
- category
- title
- description
- evidence_url

## 12.5 Tracer Study

Fields:
- tracer_id
- alumni_id
- survey_year
- education_status
- employment_status
- relevance_of_study
- satisfaction
- feedback

---

# 13. CROSS-DOMAIN RELATIONSHIPS

Relasi utama:

```text
Admission Applicant
        │
        ▼
    Admission
        │
        ▼
      Student
        │
 ┌──────┼────────┬───────────┬────────────┐
 ▼      ▼        ▼           ▼            ▼
Academic Boarding Islamic   Student      Finance
         Development         Life
 │        │        │           │            │
 └────────┴────────┴───────────┴────────────┘
                    │
                    ▼
                Graduation
                    │
                    ▼
                  Alumni
```

Student adalah pusat relasi.

---

# 14. STUDENT 360° DASHBOARD

Ketika membuka profil siswa, tampilkan:

## Header
- Foto
- Nama
- NIS
- NISN
- Kelas
- Status
- Asrama
- Kamar
- Wali kelas
- Wali asrama

## Summary Cards
- Academic Average
- Attendance %
- Tahfiz Progress
- Discipline Points
- Achievement Count
- Boarding Attendance %
- Outstanding Balance

## Tabs

1. Overview
2. Biodata
3. Family
4. Documents
5. Academic
6. Attendance
7. Boarding
8. Islamic Development
9. Tahfiz
10. Discipline
11. Counseling
12. Achievement
13. Extracurricular
14. Finance
15. Documents
16. Graduation
17. Timeline

## Timeline

Semua event penting:

- Admission
- Enrollment
- Class assignment
- Dorm assignment
- Achievement
- Discipline
- Counseling
- Leave
- Tahfiz milestone
- Promotion
- Graduation

---

# 15. ROLE BASED ACCESS CONTROL

## Super Admin
Full system administration.

## School Leadership
Dashboard dan laporan lintas domain.

## Admission Officer
Admission only.

## Academic Admin
Academic domain.

## Teacher
- Class
- Subject
- Attendance
- Assessment
- Student limited profile

## Homeroom Teacher
- Students in assigned class
- Attendance
- Academic monitoring
- Character notes
- Parent communication

## Boarding Admin
- Dorm
- Room
- Assignment
- Leave
- Boarding attendance

## Dorm Mentor
- Assigned students only
- Dorm attendance
- Leave monitoring
- Boarding incident

## Islamic Development Staff
- Tahfiz
- Diniyah
- Islamic assessment

## Counselor
- Counseling records
- Assigned students
- Restricted sensitive data

## Finance
- Billing
- Invoice
- Payment
- Scholarship

## Student Affairs
- Discipline
- Achievement
- Extracurricular
- Organization

## Graduation Admin
- Graduation
- Clearance
- Certificates

## Alumni Admin
- Alumni
- Tracer study

## Parent
Read-only access to their own child.

## Student
Read-only/self-service access to permitted own data.

---

# 16. SECURITY RULES

Implement:

- RBAC
- Row Level Security
- least privilege
- audit logging
- soft delete where appropriate
- immutable financial transactions
- immutable historical academic records after publication
- document access control
- sensitive counseling access restrictions
- sensitive health access restrictions
- session management
- MFA/2FA support for privileged users
- secure file storage
- signed/private document URLs
- backup and recovery

---

# 17. AUDIT LOG

Audit every critical operation.

Fields:
- audit_id
- actor_user_id
- action
- entity_type
- entity_id
- old_value
- new_value
- timestamp
- IP
- user_agent

Actions:
- create
- update
- delete
- approve
- reject
- publish
- export
- login
- logout

---

# 18. DOCUMENT MANAGEMENT

Every important document harus memiliki:

- document_id
- owner_type
- owner_id
- document_type
- document_number
- file_name
- storage_path
- file_size
- mime_type
- version
- uploaded_by
- uploaded_at
- verification_status

Dokumen harus menggunakan private storage.

---

# 19. GLOBAL DATA STANDARDS

## ID

Gunakan UUID sebagai primary key internal.

Contoh:

`student_id = UUID`

Nomor manusia tetap memiliki business identifier:

`NIS = 260001`

## Timestamp

Gunakan:
- created_at
- updated_at
- deleted_at

Gunakan timezone yang konsisten.

## Status

Gunakan enum atau reference table yang terkontrol.

## Soft Delete

Jangan menghapus:
- student
- financial transaction
- grade publication
- attendance historical record
- graduation record

Gunakan status/inactive/archive.

---

# 20. REPORTING

Dashboard utama:

## Leadership Dashboard
- Total Students
- New Admissions
- Active Students
- Attendance
- Academic Average
- Boarding Occupancy
- Discipline
- Tahfiz Progress
- Outstanding Finance
- Graduation Readiness

## Academic Dashboard
- Class performance
- Subject performance
- Attendance
- At-risk students
- Grade distribution

## Boarding Dashboard
- Occupancy
- Attendance
- Leave
- Late return
- Dorm incidents

## Islamic Development Dashboard
- Tahfiz progress
- Diniyah performance
- Religious activity attendance

## Student Affairs Dashboard
- Discipline trends
- Achievements
- Counseling workload
- Extracurricular participation

## Finance Dashboard
- Billing
- Collection
- Arrears
- Scholarship
- Revenue by category

---

# 21. AT-RISK STUDENT ENGINE

Sistem sebaiknya memiliki indikator risiko.

Contoh rule:

IF attendance < threshold
→ academic_risk

IF grade_average < threshold
→ academic_risk

IF discipline_points > threshold
→ behavior_risk

IF tahfiz_progress < target
→ islamic_progress_risk

IF unpaid_balance > threshold
→ financial_risk

IF multiple risks
→ student_at_risk

Output:

```text
Student Risk Profile

Academic Risk       HIGH
Attendance Risk     MEDIUM
Boarding Risk       LOW
Discipline Risk     HIGH
Islamic Risk        MEDIUM
Financial Risk      LOW

Overall Risk        HIGH
```

Jangan membuat keputusan otomatis yang bersifat menghukum. Sistem hanya memberikan **early warning** untuk ditindaklanjuti manusia.

---

# 22. STUDENT JOURNEY

## Phase 1 — Admission

Applicant
→ Registration
→ Document Verification
→ Selection
→ Interview
→ Decision
→ Re-registration

## Phase 2 — Enrollment

Applicant
→ Student Conversion
→ NIS/NISN
→ Class
→ Academic Enrollment
→ Dorm Assignment

## Phase 3 — Student Life

Student
→ Academic
→ Boarding
→ Islamic Development
→ Student Life
→ Finance

## Phase 4 — Annual Cycle

Academic Year
→ Promotion Evaluation
→ New Class
→ New Dorm Assignment
→ New Billing
→ New Targets

## Phase 5 — Graduation

Eligibility
→ Clearance
→ Graduation Decision
→ Certificate
→ Alumni Conversion

## Phase 6 — Alumni

Alumni
→ Higher Education
→ Employment
→ Achievement
→ Tracer Study
→ Alumni Engagement

---

# 23. REQUIRED WORKFLOWS

Claude AI harus mengimplementasikan workflow berikut.

### Admission Workflow

```text
Draft
→ Submitted
→ Verification
→ Selection
→ Decision
→ Re-registration
→ Student Creation
```

### Leave Workflow

```text
Draft
→ Submitted
→ Reviewed
→ Approved/Rejected
→ Departure
→ Return
→ Closed
```

### Grade Workflow

```text
Draft
→ Teacher Entry
→ Review
→ Finalize
→ Publish
→ Locked
```

### Discipline Workflow

```text
Reported
→ Reviewed
→ Categorized
→ Action
→ Follow Up
→ Resolved
```

### Graduation Workflow

```text
Candidate
→ Eligibility Check
→ Clearance
→ Final Review
→ Decision
→ Graduate
→ Alumni
```

---

# 24. NOTIFICATION SYSTEM

Events yang dapat menghasilkan notification:

- admission status
- missing document
- payment due
- payment overdue
- attendance alert
- discipline incident
- leave approval
- late return
- academic risk
- tahfiz milestone
- graduation requirement
- graduation decision

Channel:
- in-app
- email
- WhatsApp integration jika tersedia

Notification harus configurable.

---

# 25. SEARCH

Global search harus mendukung:

- Nama siswa
- NIS
- NISN
- Nomor pendaftaran
- Nama orang tua
- Kelas
- Kamar
- Asrama

Contoh:

`Ahmad`

menampilkan:

```text
Ahmad Fauzan
NIS: 260021
Grade 11 IPA 1
Dorm: Al-Farabi
Room: 203
Status: Active
```

---

# 26. IMPORT / EXPORT

Import:
- CSV
- Excel

Export:
- Excel
- CSV
- PDF

Import harus memiliki:
- template
- validation
- preview
- duplicate detection
- error report
- rollback

Jangan langsung memasukkan data import ke database tanpa validasi.

---

# 27. MASTER DATA

Master data yang wajib disediakan:

- Academic Year
- Semester
- Grade
- Class
- Subject
- Curriculum
- Teacher
- Dormitory
- Building
- Floor
- Room
- Bed
- Dorm Mentor
- Islamic Subject
- Tahfiz Target
- Discipline Category
- Achievement Category
- Extracurricular
- Organization
- Fee Type
- Payment Method
- Document Type
- Leave Type
- Student Status

---

# 28. DATABASE DESIGN PRINCIPLES

Claude AI harus:

1. Menghindari data redundancy.
2. Menggunakan foreign key.
3. Menggunakan unique constraint untuk business identifiers.
4. Menggunakan index untuk foreign keys dan field pencarian.
5. Menggunakan transaction untuk operasi multi-table.
6. Menjaga referential integrity.
7. Memisahkan master dan transaction.
8. Memisahkan current state dan history.
9. Tidak menyimpan derived value jika dapat dihitung secara aman, kecuali untuk caching/performance.
10. Menyediakan audit trail untuk perubahan kritis.

---

# 29. RECOMMENDED CORE TABLES

Minimal:

```text
persons
students
student_status_histories
parents
student_parent_relationships
addresses
student_documents
emergency_contacts

admission_periods
applicants
applicant_documents
admission_selections
admission_decisions

academic_years
semesters
grades
classes
subjects
teachers
student_enrollments
schedules
attendance
assessments
grade_records
report_cards

dormitories
rooms
beds
room_assignments
dorm_activities
dorm_attendance
leave_requests
late_returns

islamic_subjects
tahfiz_targets
tahfiz_records
islamic_assessments
religious_activities

discipline_incidents
counseling_records
achievements
extracurriculars
extracurricular_enrollments
organizations
organization_memberships

fee_structures
billing_accounts
invoices
payments
scholarships

graduation_requirements
graduation_eligibilities
clearances
graduation_decisions

alumni
alumni_education
alumni_employment
alumni_achievements
tracer_studies

notifications
audit_logs
```

---

# 30. CLAUDE AI IMPLEMENTATION INSTRUCTION

Anda adalah **Senior Solution Architect, Product Manager, Database Architect, Security Engineer, dan Senior Full-Stack Engineer**.

Bangun sistem berdasarkan dokumen ini sebagai **source of truth**.

Jangan langsung membuat seluruh aplikasi sekaligus.

Gunakan tahapan:

### Phase 1
Foundation:
- authentication
- users
- roles
- permissions
- audit log
- master data
- database architecture

### Phase 2
Admission:
- admission period
- applicant
- registration
- verification
- selection
- admission decision
- student conversion

### Phase 3
Student Master:
- student profile
- family
- guardian
- documents
- status history
- Student 360°

### Phase 4
Academic:
- academic year
- class
- subject
- enrollment
- schedule
- attendance
- assessment
- grades
- report card

### Phase 5
Boarding:
- dormitory
- room
- bed
- assignment
- attendance
- leave
- return monitoring

### Phase 6
Islamic Development:
- diniyah
- tahfiz
- Qur'an
- Islamic assessment
- religious activity

### Phase 7
Student Life:
- discipline
- counseling
- achievement
- extracurricular
- organization

### Phase 8
Finance:
- fee structure
- billing
- invoice
- payment
- scholarship
- arrears

### Phase 9
Graduation:
- eligibility
- clearance
- decision
- certificate

### Phase 10
Alumni:
- alumni profile
- higher education
- employment
- achievement
- tracer study

---

# 31. ACCEPTANCE CRITERIA

Sistem dianggap berhasil apabila:

- Setiap siswa memiliki satu unique `student_id`.
- Tidak ada duplicate student master.
- Applicant dapat dikonversi menjadi student tanpa kehilangan histori admission.
- Siswa dapat memiliki histori kelas dari tahun ke tahun.
- Siswa dapat memiliki histori asrama/kamar.
- Siswa dapat memiliki histori izin.
- Nilai dan attendance terhubung ke student.
- Tahfiz terhubung ke student.
- Discipline dan counseling terhubung ke student dengan akses terbatas.
- Billing dan payment terhubung ke student.
- Graduation dapat melakukan clearance lintas departemen.
- Student dapat dikonversi menjadi alumni.
- Semua transaksi penting memiliki audit log.
- RBAC bekerja pada level menu, API, dan database/RLS.
- Data sensitif tidak dapat diakses oleh role yang tidak berwenang.
- Sistem mampu menampilkan Student 360°.
- Sistem mampu menghasilkan laporan lintas domain.

---

# 32. PRIORITY

## P0 — Critical
- Authentication
- RBAC
- Student Master
- Admission
- Academic
- Boarding
- Audit Log

## P1 — High
- Islamic Development
- Student Life
- Finance
- Student 360°
- Dashboard
- Notification

## P2 — Medium
- Graduation
- Alumni
- Tracer Study
- Advanced Analytics

## P3 — Future
- Parent Mobile App
- Student Mobile App
- WhatsApp integration
- AI Early Warning
- AI Student Advisor
- Predictive Analytics
- Biometric integration
- QR attendance
- Payment gateway

---

# 33. FINAL ARCHITECTURE PRINCIPLE

Jangan membangun sistem sebagai kumpulan menu yang berdiri sendiri.

Bangun sebagai **Student Lifecycle Platform**.

```text
                    ┌───────────────┐
                    │   ADMISSION   │
                    └───────┬───────┘
                            ↓
                    ┌───────────────┐
                    │ STUDENT MASTER│
                    └───────┬───────┘
                            ↓
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
   ┌─────────┐        ┌──────────┐       ┌──────────────┐
   │ACADEMIC │        │ BOARDING │       │   ISLAMIC    │
   │         │        │          │       │ DEVELOPMENT  │
   └────┬────┘        └────┬─────┘       └──────┬───────┘
        │                  │                    │
        └──────────────────┼────────────────────┘
                           ↓
                  ┌─────────────────┐
                  │  STUDENT LIFE   │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │     FINANCE     │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │   GRADUATION    │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │     ALUMNI      │
                  └─────────────────┘
```

**Target architecture:**

`One Person → One Student Identity → One Student 360° → Multiple Domain Records → Complete Student Lifecycle`

Claude AI harus selalu mempertahankan prinsip tersebut ketika membuat database schema, API, UI, workflow, validation, authorization, reporting, dan integrasi.
