import React, { useEffect, useState, useCallback } from 'react'
import {
    TrashIcon,
    PencilIcon,
    ArchiveBoxIcon,
    TagIcon,
    PencilSquareIcon,
    CheckIcon,
    XMarkIcon
} from '@heroicons/react/24/outline'
import axios from 'axios'

const API_BASE = 'http://localhost:5274/api'

export default function App() {
    const [token, setToken] = useState('')
    const [loginForm, setLoginForm] = useState({ UserName: '', Password: '' })
    const [loginError, setLoginError] = useState('')
    const [loading, setLoading] = useState(false)
    const [apiError, setApiError] = useState('')

    const [notes, setNotes] = useState([])
    const [categories, setCategories] = useState([])
    const [activeCategoryFilter, setActiveCategoryFilter] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [form, setForm] = useState({
        title: '',
        content: '',
        archived: false,
        selectedCategoryIds: []
    })
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [viewArchived, setViewArchived] = useState(false)
    const [showCategoryForm, setShowCategoryForm] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [assigningNoteId, setAssigningNoteId] = useState(null)
    const [assignSelection, setAssignSelection] = useState([])

    // Estados para edición de categorías
    const [editingCategoryId, setEditingCategoryId] = useState(null)
    const [editingCategoryName, setEditingCategoryName] = useState('')

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
            localStorage.setItem('token', token)
        } else {
            delete axios.defaults.headers.common['Authorization']
            localStorage.removeItem('token')
        }
    }, [token])

    const loadNotes = useCallback(async () => {
        setLoading(true)
        setApiError('')
        const route = viewArchived ? 'notes/archived' : 'notes/active'
        try {
            const res = await axios.get(`${API_BASE}/${route}`)
            setNotes(Array.isArray(res.data) ? res.data : [])
        } catch {
            setApiError('Error cargando notas')
            setNotes([])
        }
        setLoading(false)
    }, [viewArchived])

    const loadCategories = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/categories`)
            setCategories(Array.isArray(res.data) ? res.data : [])
        } catch {
            setCategories([])
        }
    }, [])

    useEffect(() => {
        if (token) {
            loadNotes()
            loadCategories()
        }
    }, [token, loadNotes, loadCategories])

    // --- HANDLERS ---

    const handleLogin = async e => {
        e.preventDefault()
        setLoginError('')
        setApiError('')
        setLoading(true)
        try {
            const res = await axios.post(`${API_BASE}/auth/login`, loginForm)
            setToken(res.data.token)
        } catch {
            setLoginError('Credenciales inválidas')
        } finally {
            setLoading(false)
        }
    }

    const logout = () => {
        setToken('')
        setNotes([])
        setCategories([])
        setSearchQuery('')
        setActiveCategoryFilter(null)
        setForm({ title: '', content: '', archived: false, selectedCategoryIds: [] })
        setShowForm(false)
        setEditingId(null)
        setViewArchived(false)
        setShowCategoryForm(false)
        setNewCategoryName('')
        setAssigningNoteId(null)
        setAssignSelection([])
        setEditingCategoryId(null)
        setEditingCategoryName('')
    }

    const saveNote = async () => {
        if (!form.title.trim() || !form.content.trim()) return
        let noteId = editingId
        setLoading(true)
        setApiError('')
        try {
            if (editingId) {
                await axios.put(`${API_BASE}/notes/${noteId}`, {
                    title: form.title,
                    content: form.content,
                    archived: form.archived
                })
            } else {
                const { data: newNote } = await axios.post(`${API_BASE}/notes`, {
                    title: form.title,
                    content: form.content,
                    archived: false
                })
                noteId = newNote.id
            }
            // Sincronizar categorías
            const { data: existing } = await axios.get(`${API_BASE}/notes/${noteId}/categories`)
            const existingIds = Array.isArray(existing) ? existing.map(c => c.id) : []
            // Agregar nuevas
            for (const id of form.selectedCategoryIds.filter(i => !existingIds.includes(i))) {
                await axios.post(`${API_BASE}/notes/${noteId}/categories`, { categoryId: id })
            }
            // Eliminar quitadas
            for (const id of existingIds.filter(i => !form.selectedCategoryIds.includes(i))) {
                await axios.delete(`${API_BASE}/notes/${noteId}/categories/${id}`)
            }
            await loadNotes()
            await loadCategories() // <- Nueva línea por si cambia
        } catch {
            setApiError('Error guardando nota')
        } finally {
            setSearchQuery('')
            setActiveCategoryFilter(null)
            setForm({ title: '', content: '', archived: false, selectedCategoryIds: [] })
            setEditingId(null)
            setShowForm(false)
            setLoading(false)
        }
    }

    const startEdit = note => {
        setViewArchived(false)
        setShowForm(true)
        setEditingId(note.id)
        setForm({
            title: note.title || '',
            content: note.content || '',
            archived: note.archived || false,
            selectedCategoryIds: Array.isArray(note.noteCategories)
                ? note.noteCategories.map(nc => nc.categoryId)
                : []
        })
    }

    const toggleArchive = async (id, archived) => {
        const action = archived ? 'unarchive' : 'archive'
        setLoading(true)
        setApiError('')
        try {
            await axios.patch(`${API_BASE}/notes/${id}/${action}`)
            await loadNotes()
            setShowForm(false)
        } catch {
            setApiError('Error archivando nota')
        }
        setLoading(false)
    }

    const deleteNote = async id => {
        if (!window.confirm('¿Eliminar esta nota?')) return
        setLoading(true)
        setApiError('')
        try {
            await axios.delete(`${API_BASE}/notes/${id}`)
            await loadNotes()
        } catch {
            setApiError('Error eliminando nota')
        }
        setLoading(false)
    }

    const createCategory = async () => {
        if (!newCategoryName.trim()) return
        setLoading(true)
        setApiError('')
        try {
            await axios.post(`${API_BASE}/categories`, {
                name: newCategoryName.trim()
            })
            setNewCategoryName('')
            setShowCategoryForm(false)
            await loadCategories()
        } catch {
            setApiError('Error creando categoría')
        }
        setLoading(false)
    }

    const startEditCategory = cat => {
        setEditingCategoryId(cat.id)
        setEditingCategoryName(cat.name)
        setShowCategoryForm(false)
    }

    const cancelEditCategory = () => {
        setEditingCategoryId(null)
        setEditingCategoryName('')
    }

    const saveCategoryEdit = async () => {
        if (!editingCategoryName.trim()) return
        setLoading(true)
        setApiError('')
        try {
            await axios.put(`${API_BASE}/categories/${editingCategoryId}`, {
                name: editingCategoryName.trim()
            })
            setEditingCategoryId(null)
            setEditingCategoryName('')
            await loadCategories()
        } catch {
            setApiError('Error editando categoría')
        }
        setLoading(false)
    }

    const openAssignModal = note => {
        setAssigningNoteId(note.id)
        setAssignSelection(Array.isArray(note.noteCategories) ? note.noteCategories.map(nc => nc.categoryId) : [])
    }

    const assignCategories = async () => {
        setLoading(true)
        setApiError('')
        try {
            const { data: existing } = await axios.get(
                `${API_BASE}/notes/${assigningNoteId}/categories`
            )
            const existingIds = Array.isArray(existing) ? existing.map(c => c.id) : []
            for (const id of existingIds.filter(i => !assignSelection.includes(i))) {
                await axios.delete(`${API_BASE}/notes/${assigningNoteId}/categories/${id}`)
            }
            for (const id of assignSelection.filter(i => !existingIds.includes(i))) {
                await axios.post(`${API_BASE}/notes/${assigningNoteId}/categories`, {
                    categoryId: id
                })
            }
            setAssigningNoteId(null)
            setAssignSelection([])
            await loadNotes()
        } catch {
            setApiError('Error asignando categorías')
        }
        setLoading(false)
    }

    const filteredNotes = notes
        .filter(
            n =>
                (n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (n.content || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
        .filter(
            n =>
                !activeCategoryFilter ||
                (Array.isArray(n.noteCategories) ? n.noteCategories : []).some(nc => nc.categoryId === activeCategoryFilter)
        )

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-300 via-purple-200 to-purple-300 p-4">
                <form
                    onSubmit={handleLogin}
                    className="bg-white bg-opacity-60 backdrop-blur-sm rounded-xl shadow-lg p-10 w-full max-w-sm"
                    autoComplete="off"
                >
                    <div className="flex flex-col items-center mb-6">
                        <div className="bg-purple-300 rounded-full p-3 mb-2">
                            <PencilSquareIcon className="h-8 w-8 text-purple-700" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">Ensolvers</h2>
                        <p className="text-gray-700 mb-6 text-center">Inicia sesión para acceder a tus notas</p>
                    </div>
                    {loginError && <p className="text-red-500 mb-4 text-center">{loginError}</p>}
                    <input
                        type="text"
                        placeholder="Correo electrónico"
                        value={loginForm.UserName}
                        onChange={e => setLoginForm({ ...loginForm, UserName: e.target.value })}
                        className="w-full mb-4 px-4 py-3 rounded-lg border border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        autoComplete="username"
                        autoFocus
                    />
                    <input
                        type="password"
                        placeholder="Contraseña"
                        value={loginForm.Password}
                        onChange={e => setLoginForm({ ...loginForm, Password: e.target.value })}
                        className="w-full mb-6 px-4 py-3 rounded-lg border border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        autoComplete="current-password"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-400 text-white font-semibold rounded-lg shadow-md hover:from-purple-700 hover:to-purple-500 transition"
                    >
                        {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        )
    }

    return (
        <div className="flex h-screen font-sans">
            <aside className="w-64 bg-gradient-to-b from-indigo-600 to-purple-600 text-white p-6 flex flex-col">
                <h2 className="text-2xl font-bold mb-8">App Notas</h2>
                <nav className="flex-1 space-y-2">
                    <button
                        type="button"
                        className={`w-full text-left py-2 px-3 rounded-lg ${!viewArchived ? 'bg-white text-indigo-600' : 'hover:bg-indigo-500'}`}
                        onClick={() => { setViewArchived(false); setShowForm(false) }}
                    >
                        Active Notes
                    </button>
                    <button
                        type="button"
                        className={`w-full text-left py-2 px-3 rounded-lg ${viewArchived ? 'bg-white text-indigo-600' : 'hover:bg-indigo-500'}`}
                        onClick={() => { setViewArchived(true); setShowForm(false) }}
                    >
                        Archived Notes
                    </button>
                </nav>
                <div className="mt-auto">
                    <h3 className="uppercase text-sm mb-2">Categories</h3>
                    <ul className="space-y-1">
                        <li
                            className={`cursor-pointer flex justify-between ${activeCategoryFilter === null ? 'font-bold' : ''}`}
                            onClick={() => setActiveCategoryFilter(null)}
                        >
                            <span>All</span>
                            <span className="bg-white text-indigo-600 rounded-full px-2 text-xs">{notes.length}</span>
                        </li>
                        {categories.map(cat => (
                            <li
                                key={cat.id}
                                className={`cursor-pointer flex justify-between items-center ${activeCategoryFilter === cat.id ? 'font-bold' : ''}`}
                            >
                                {editingCategoryId === cat.id ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editingCategoryName}
                                            onChange={e => setEditingCategoryName(e.target.value)}
                                            className="px-2 py-1 rounded border border-gray-300 text-black mr-2"
                                            autoFocus
                                        />
                                        <div className="flex space-x-1">
                                            <button
                                                onClick={saveCategoryEdit}
                                                className="text-green-600 hover:text-green-800"
                                                disabled={loading}
                                                title="Guardar"
                                            >
                                                <CheckIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={cancelEditCategory}
                                                className="text-red-600 hover:text-red-800"
                                                disabled={loading}
                                                title="Cancelar"
                                            >
                                                <XMarkIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <span
                                            className="cursor-pointer"
                                            onClick={() => setActiveCategoryFilter(cat.id)}
                                        >
                                            {cat.name}
                                        </span>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => startEditCategory(cat)}
                                                className="hover:text-yellow-400"
                                                title="Editar categoría"
                                            >
                                                <PencilIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (!window.confirm(`¿Eliminar la categoría "${cat.name}"?`)) return
                                                    setLoading(true)
                                                    setApiError('')
                                                    try {
                                                        await axios.delete(`${API_BASE}/categories/${cat.id}`)
                                                        await loadCategories()
                                                    } catch {
                                                        setApiError('Error eliminando categoría')
                                                    }
                                                    setLoading(false)
                                                }}
                                                className="hover:text-red-600"
                                                title="Eliminar categoría"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </>
                                )}
                                <span className="bg-white text-indigo-600 rounded-full px-2 text-xs ml-auto">
                                    {notes.filter(n => (Array.isArray(n.noteCategories) ? n.noteCategories : []).some(nc => nc.categoryId === cat.id)).length}
                                </span>
                            </li>
                        ))}
                    </ul>
                    {showCategoryForm ? (
                        <div className="mt-4 p-4 bg-white text-black rounded shadow">
                            <input
                                type="text"
                                placeholder="Nueva categoria"
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                                className="w-full mb-2 px-2 py-1 border rounded"
                                autoFocus
                            />
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                    onClick={() => setShowCategoryForm(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                    onClick={createCategory}
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="mt-6 w-full border border-white rounded-lg py-2 hover:bg-white hover:text-indigo-600 transition"
                            onClick={() => setShowCategoryForm(true)}
                        >
                            + Add Category
                        </button>
                    )}
                </div>
                <button
                    type="button"
                    className="mt-6 w-full border border-white rounded-lg py-2 hover:bg-white hover:text-indigo-600 transition"
                    onClick={logout}
                >
                    Logout
                </button>
            </aside>

            <main className="flex-1 bg-gray-50 p-8 overflow-auto">
                <header className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-semibold">
                        {viewArchived ? 'Archived Notes' : 'Active Notes'}
                    </h1>
                    <div className="flex items-center space-x-4">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none"
                        />
                        {!viewArchived && (
                            <button
                                type="button"
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                                onClick={() => {
                                    setShowForm(f => !f)
                                    setEditingId(null)
                                    setForm({ title: '', content: '', archived: false, selectedCategoryIds: [] })
                                }}
                            >
                                + New Note
                            </button>
                        )}
                    </div>
                </header>
                {apiError && <div className="text-red-500 mb-4">{apiError}</div>}
                {loading && <div className="text-gray-500 mb-4">Cargando...</div>}

                {!viewArchived && showForm && (
                    <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
                        <input
                            type="text"
                            placeholder="Titulo"
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            className="block w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
                        />
                        <textarea
                            placeholder="Contenido"
                            value={form.content}
                            onChange={e => setForm({ ...form, content: e.target.value })}
                            rows="4"
                            className="block w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
                        />
                        <fieldset className="mb-4">
                            <legend className="font-semibold mb-2">Categorias</legend>
                            <div className="grid grid-cols-3 gap-2">
                                {categories.map(cat => (
                                    <label key={cat.id} className="inline-flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={form.selectedCategoryIds.includes(cat.id)}
                                            onChange={e => {
                                                const s = new Set(form.selectedCategoryIds)
                                                if (e.target.checked) s.add(cat.id)
                                                else s.delete(cat.id)
                                                setForm({ ...form, selectedCategoryIds: Array.from(s) })
                                            }}
                                        />
                                        <span>{cat.name}</span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                        <div className="flex space-x-4">
                            <button
                                type="button"
                                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
                                onClick={saveNote}
                                disabled={loading}
                            >
                                {editingId ? 'Actualizar' : 'Crear'}
                            </button>
                            <button
                                type="button"
                                className="border border-gray-400 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
                                onClick={() => setShowForm(false)}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-6">
                    {filteredNotes.length === 0 ? (
                        <p className="col-span-3 text-center text-gray-500">No hay notas</p>
                    ) : (
                        filteredNotes.map(note => (
                            <div key={note.id} className="bg-white rounded-xl shadow p-6 relative">
                                <h3 className="text-xl font-bold mb-2">{note.title}</h3>
                                <p className="text-gray-600 mb-2 whitespace-pre-line">{note.content}</p>
                                <div className="flex flex-wrap gap-1 mb-4">
                                    {(Array.isArray(note.noteCategories) ? note.noteCategories : []).map(nc => {
                                        const cat = categories.find(c => c.id === nc.categoryId)
                                        return (
                                            <span key={nc.categoryId} className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs">
                                                {cat?.name}
                                            </span>
                                        )
                                    })}
                                </div>
                                <p className="text-xs text-gray-400 mb-4">
                                    Creada: {note.createdAt ? new Date(note.createdAt).toLocaleString() : 'N/A'}<br />
                                    Actualizada: {note.updatedAt ? new Date(note.updatedAt).toLocaleString() : 'N/A'}
                                </p>
                                <div className="absolute bottom-4 right-6 flex space-x-4 text-sm">
                                    <button
                                        onClick={() => toggleArchive(note.id, note.archived)}
                                        className="hover:text-indigo-800 transition"
                                        aria-label={note.archived ? 'Desarchivar' : 'Archivar'}
                                        disabled={loading}
                                    >
                                        <ArchiveBoxIcon className="h-5 w-5 text-indigo-600" />
                                    </button>
                                    <button
                                        onClick={() => startEdit(note)}
                                        className="hover:text-blue-800 transition"
                                        aria-label="Editar"
                                        disabled={loading}
                                    >
                                        <PencilIcon className="h-5 w-5 text-blue-600" />
                                    </button>
                                    <button
                                        onClick={() => deleteNote(note.id)}
                                        className="hover:text-red-800 transition"
                                        aria-label="Eliminar"
                                        disabled={loading}
                                    >
                                        <TrashIcon className="h-5 w-5 text-red-600" />
                                    </button>
                                    <button
                                        onClick={() => openAssignModal(note)}
                                        className="hover:text-green-800 transition"
                                        aria-label="Asignar categoria"
                                        disabled={loading}
                                    >
                                        <TagIcon className="h-5 w-5 text-green-600" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {assigningNoteId && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                            <h2 className="text-xl mb-4">Asignar Categorias</h2>
                            <div className="space-y-2 max-h-64 overflow-auto">
                                {categories.map(cat => (
                                    <label key={cat.id} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={assignSelection.includes(cat.id)}
                                            onChange={e => {
                                                const s = new Set(assignSelection)
                                                if (e.target.checked) s.add(cat.id)
                                                else s.delete(cat.id)
                                                setAssignSelection(Array.from(s))
                                            }}
                                        />
                                        <span>{cat.name}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="mt-4 flex justify-end space-x-2">
                                <button
                                    onClick={() => setAssigningNoteId(null)}
                                    className="px-4 py-2 border rounded hover:bg-gray-100"
                                    disabled={loading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={assignCategories}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                    disabled={loading}
                                >
                                    Asignar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            ></main>
        </div>
    )
}
