import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Modal from '../UI/Modal'
import Button from '../UI/Button'
import { useEmpleadosStore } from '../../store/useEmpleadosStore'

const emptyForm = {
  name: '', cedula: '', birthDate: '', gender: '', civilStatus: '',
  phone: '', email: '', address: '', city: '',
  emergencyName: '', emergencyRelation: '', emergencyPhone: '', emergencyAddress: '',
  role: '', department: '', supervisor: '', startDate: '', contractType: '', contractUntil: '',
  monthlyRate: '', nonConstitutiveSalary: '', cargaPct: '', status: 'Activo',
  eps: '', pension: '', arl: '', cajaCompensacion: '',
}

const statusOptions = ['Activo', 'Vacaciones', 'Incapacidad', 'Retirado']
const genderOptions = ['', 'Femenino', 'Masculino', 'Otro']
const civilOptions = ['', 'Soltero/a', 'Casado/a', 'Unión libre', 'Divorciado/a', 'Viudo/a']
const contractTypes = ['', 'Término fijo', 'Término indefinido', 'Prestación de servicios', 'Obra o labor', 'Aprendizaje']

function SectionTitle({ children }) {
  return <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mt-4 mb-2 border-b border-indigo-100 pb-1">{children}</p>
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"

export default function FormEmpleado() {
  const { modalOpen, editingEmployee, closeModal, addEmployee, updateEmployee, employees } = useEmpleadosStore()
  const [form, setForm] = useState(emptyForm)
  const supervisorOptions = employees.filter((e) => e.id !== editingEmployee?.id)

  useEffect(() => {
    if (editingEmployee) {
      const f = {}
      for (const key of Object.keys(emptyForm)) {
        f[key] = editingEmployee[key] ?? emptyForm[key]
      }
      setForm(f)
    } else {
      setForm(emptyForm)
    }
  }, [editingEmployee, modalOpen])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, form)
        toast.success('Empleado actualizado')
      } else {
        await addEmployee(form)
        toast.success('Empleado agregado')
      }
      closeModal()
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar el empleado')
    }
  }

  return (
    <Modal open={modalOpen} onClose={closeModal} title={editingEmployee ? 'Editar empleado' : 'Nuevo empleado'}>
      <form onSubmit={handleSubmit} className="space-y-1 max-h-[65vh] overflow-y-auto pr-1">

        {/* ── Personal ── */}
        <SectionTitle>Información personal</SectionTitle>
        <Field label="Nombre completo *">
          <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Nombre completo" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cédula">
            <input type="text" name="cedula" value={form.cedula} onChange={handleChange} placeholder="Número de documento" className={inputCls} />
          </Field>
          <Field label="Fecha de nacimiento">
            <input type="date" name="birthDate" value={form.birthDate} onChange={handleChange} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Género">
            <select name="gender" value={form.gender} onChange={handleChange} className={inputCls}>
              {genderOptions.map((g) => <option key={g} value={g}>{g || 'Seleccionar...'}</option>)}
            </select>
          </Field>
          <Field label="Estado civil">
            <select name="civilStatus" value={form.civilStatus} onChange={handleChange} className={inputCls}>
              {civilOptions.map((c) => <option key={c} value={c}>{c || 'Seleccionar...'}</option>)}
            </select>
          </Field>
        </div>

        {/* ── Contacto ── */}
        <SectionTitle>Información de contacto</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Celular">
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="300 000 0000" className={inputCls} />
          </Field>
          <Field label="Correo electrónico">
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="correo@ejemplo.com" className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dirección">
            <input type="text" name="address" value={form.address} onChange={handleChange} className={inputCls} />
          </Field>
          <Field label="Ciudad">
            <input type="text" name="city" value={form.city} onChange={handleChange} className={inputCls} />
          </Field>
        </div>

        {/* ── Contacto emergencia ── */}
        <SectionTitle>Contacto de emergencia</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre del contacto">
            <input type="text" name="emergencyName" value={form.emergencyName} onChange={handleChange} className={inputCls} />
          </Field>
          <Field label="Parentesco">
            <input type="text" name="emergencyRelation" value={form.emergencyRelation} onChange={handleChange} placeholder="Ej: Madre, Esposo/a" className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono">
            <input type="tel" name="emergencyPhone" value={form.emergencyPhone} onChange={handleChange} className={inputCls} />
          </Field>
          <Field label="Dirección (opcional)">
            <input type="text" name="emergencyAddress" value={form.emergencyAddress} onChange={handleChange} className={inputCls} />
          </Field>
        </div>

        {/* ── Laboral ── */}
        <SectionTitle>Información laboral</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cargo">
            <input type="text" name="role" value={form.role} onChange={handleChange} className={inputCls} />
          </Field>
          <Field label="Área / Departamento">
            <input type="text" name="department" value={form.department} onChange={handleChange} placeholder="Ej: Diseño, Proyectos" className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jefe inmediato">
            <select name="supervisor" value={form.supervisor} onChange={handleChange} className={inputCls}>
              <option value="">Seleccionar...</option>
              {supervisorOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Estado">
            <select name="status" value={form.status} onChange={handleChange} className={inputCls}>
              {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha de ingreso">
            <input type="date" name="startDate" value={form.startDate} onChange={handleChange} className={inputCls} />
          </Field>
          <Field label="Tipo de contrato">
            <select name="contractType" value={form.contractType} onChange={handleChange} className={inputCls}>
              {contractTypes.map((c) => <option key={c} value={c}>{c || 'Seleccionar...'}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Salario mensual">
            <input type="number" name="monthlyRate" value={form.monthlyRate} onChange={handleChange} min="0" className={inputCls} />
          </Field>
          <Field label="Salario no constitutivo">
            <input type="number" name="nonConstitutiveSalary" value={form.nonConstitutiveSalary} onChange={handleChange} min="0" className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Carga prestacional (%)">
            <input type="number" name="cargaPct" value={form.cargaPct} onChange={handleChange} min="0" step="0.01" placeholder="Ej: 23.67" className={inputCls} />
          </Field>
          <Field label="Vencimiento contrato">
            <input type="date" name="contractUntil" value={form.contractUntil} onChange={handleChange} className={inputCls} />
          </Field>
        </div>
        <p className="text-xs text-gray-400 -mt-1">
          % de carga prestacional individual (prestaciones, aportes) sobre el salario de este empleado. Se usa para calcular el valor real del día en costeo de proyectos.
        </p>

        {/* ── Seguridad social ── */}
        <SectionTitle>Seguridad social</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="EPS">
            <input type="text" name="eps" value={form.eps} onChange={handleChange} className={inputCls} />
          </Field>
          <Field label="Fondo de pensión">
            <input type="text" name="pension" value={form.pension} onChange={handleChange} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ARL">
            <input type="text" name="arl" value={form.arl} onChange={handleChange} className={inputCls} />
          </Field>
          <Field label="Caja de compensación">
            <input type="text" name="cajaCompensacion" value={form.cajaCompensacion} onChange={handleChange} className={inputCls} />
          </Field>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Los documentos (cédula, hoja de vida, contrato, certificados) se suben desde la ficha del empleado, una vez guardado.
        </p>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button>
          <Button type="submit">{editingEmployee ? 'Guardar cambios' : 'Agregar empleado'}</Button>
        </div>
      </form>
    </Modal>
  )
}
