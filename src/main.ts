import { supabase } from './supabaseClient.ts'
let editingId: any = null
let allCourses: any[] = []
const $ = (id: string) => document.getElementById(id) as any

$('signin-btn').onclick = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: $('email').value,
    password: $('password').value
  })
  if (error) { $('auth-msg').textContent = error.message; return }
  $('auth-section').style.display = 'none'
  $('app-section').style.display = 'block'
  $('signed-in-as').textContent = 'Signed in as ' + data.user.email
  loadCourses(); loadStudents()
}
$('signout-btn').onclick = async () => { await supabase.auth.signOut(); location.reload() }

async function loadCourses() {
  const { data } = await supabase.from('courses').select('*').order('course_id')
  allCourses = data || []
  $('course-select').innerHTML = allCourses.map((c: any) => `<option value="${c.course_id}">${c.course_name} (${c.course_code})</option>`).join('')
  $('report-course').innerHTML = allCourses.map((c: any) => `<option value="${c.course_id}">${c.course_name}</option>`).join('')
}
async function loadStudents(search = '') {
  let query: any = supabase.from('students').select('*').order('student_id', { ascending: true }).limit(100)
  if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,student_no.ilike.%${search}%`)
  const { data } = await query
  $('student-list').innerHTML = (data || []).map((s: any) => `
    <div style="border:1px solid #ddd; padding:10px; margin:5px 0">
      <b>${s.first_name} ${s.last_name}</b> - ${s.student_no || ''} - ${s.course || ''} - Year ${s.year_level || ''}
      <br><button onclick="window.editStudent('${s.student_id}')">Edit</button>
      <button onclick="window.deleteStudent('${s.student_id}')">Delete</button>
    </div>`).join('')
  ;(window as any)._students = data || []
}
$('search-btn').onclick = () => loadStudents($('search').value)
$('save-btn').onclick = async () => {
  const course = allCourses.find((c: any) => String(c.course_id) === $('course-select').value)
  const payload = { student_no: $('student_no').value, first_name: $('first_name').value, last_name: $('last_name').value, year_level: Number($('year_level').value), email: $('student_email').value, course: course?.course_code || '', course_id: Number($('course-select').value) }
  if (editingId) { await supabase.from('students').update(payload).eq('student_id', editingId); editingId = null }
  else { await supabase.from('students').insert(payload) }
  loadStudents()
}
;(window as any).editStudent = (id: string) => {
  const s = (window as any)._students.find((x: any) => String(x.student_id) === String(id))
  if (!s) return; editingId = s.student_id
  $('student_no').value = s.student_no || ''; $('first_name').value = s.first_name || ''; $('last_name').value = s.last_name || ''; $('year_level').value = s.year_level || ''; $('student_email').value = s.email || ''
}
;(window as any).deleteStudent = async (id: string) => { if (!confirm('Delete this student?')) return; await supabase.from('students').delete().eq('student_id', id); loadStudents() }
$('count-btn').onclick = async () => {
  const courseId = Number($('report-course').value)
  const { data, error } = await supabase.rpc('count_students_by_course', { p_course_id: courseId })
  $('count-result').textContent = error ? error.message : `Total students: ${data}`
}