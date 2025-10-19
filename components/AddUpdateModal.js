// components/AddUpdateModal.js

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import clsx from 'clsx';

// PASTIKAN ADA "export default" DI SINI
export default function AddUpdateModal({ isOpen, closeModal, onUpdateAdded }) {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [statusText, setStatusText] = useState('');
  const [progress, setProgress] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchCompanies = async () => {
        const { data, error } = await supabase.schema('mplan').from('company').select('id, name');
        if (data) {
          setCompanies(data);
        }
      };
      fetchCompanies();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyId || !statusText) {
        setError('Perusahaan dan Status wajib diisi.');
        return;
    }

    setIsSaving(true);
    setError('');

    const { data, error: insertError } = await supabase
      .schema('mplan')
      .from('updates')
      .insert({
        company_id: companyId,
        status_text: statusText,
        progress: progress,
        notes: notes,
        update_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single(); // Ambil satu data saja

    setIsSaving(false);

    if (insertError) {
      console.error('Error inserting data:', insertError);
      setError('Gagal menyimpan data. Coba lagi.');
    } else {
      onUpdateAdded(); // Panggil callback untuk refresh
      handleCloseModal();
    }
  };

  const handleCloseModal = () => {
    setCompanyId('');
    setStatusText('');
    setProgress(0);
    setNotes('');
    setError('');
    closeModal();
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleCloseModal}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                  Tambah Update Baru
                </Dialog.Title>
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <div>
                        <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Perusahaan</label>
                        <select id="company" value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600">
                            <option value="">Pilih Perusahaan</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                        <input type="text" id="status" value={statusText} onChange={(e) => setStatusText(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600" />
                    </div>

                    <div>
                        <label htmlFor="progress" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Progress: {progress}%</label>
                        <input type="range" id="progress" min="0" max="100" value={progress} onChange={(e) => setProgress(e.target.value)} className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
                    </div>

                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Catatan</label>
                        <textarea id="notes" rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"></textarea>
                    </div>

                    <div className="mt-6 flex justify-end space-x-2">
                        <button type="button" onClick={handleCloseModal} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500">
                            Batal
                        </button>
                        <button type="submit" disabled={isSaving} className={clsx('inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none', { 'bg-blue-400 cursor-not-allowed': isSaving })}>
                            {isSaving ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}