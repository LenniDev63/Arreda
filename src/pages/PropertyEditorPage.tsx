import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Loader2, Upload, X, ArrowLeft, Save, ImageIcon, AlertCircle, Check, Camera,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { AMENITIES, RENTAL_TYPES } from '@/lib/constants';
import { AmenityIcon } from '@/components/AmenityIcon';
import type { RentalType, PropertyPhoto, PropertyStatus } from '@/lib/types';
import { fetchProperty } from '@/lib/queries';

interface FormState {
  titulo: string;
  descricao: string;
  cidade: string;
  bairro: string;
  endereco: string;
  quartos: number;
  banheiros: number;
  capacidade: number;
  regras: string;
  politica_cancelamento: string;
  status: PropertyStatus;
  amenities: string[];
  pricing: Partial<Record<RentalType, string>>;
}

const DEFAULT_FORM: FormState = {
  titulo: '',
  descricao: '',
  cidade: '',
  bairro: '',
  endereco: '',
  quartos: 1,
  banheiros: 1,
  capacidade: 2,
  regras: '',
  politica_cancelamento: 'Reembolso total até 3 dias antes do check-in.',
  status: 'publicado',
  amenities: [],
  pricing: {},
};

export default function PropertyEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const p = await fetchProperty(id);
        if (!p) { setError('Imóvel não encontrado.'); setLoading(false); return; }
        if (p.owner_id !== profile?.id) { setError('Você não tem permissão para editar este imóvel.'); setLoading(false); return; }
        setForm({
          titulo: p.titulo,
          descricao: p.descricao,
          cidade: p.cidade,
          bairro: p.bairro,
          endereco: p.endereco,
          quartos: p.quartos,
          banheiros: p.banheiros,
          capacidade: p.capacidade,
          regras: p.regras,
          politica_cancelamento: p.politica_cancelamento,
          status: p.status ?? 'publicado',
          amenities: (p.amenities ?? []).map((a) => a.amenity_name),
          pricing: Object.fromEntries((p.pricing ?? []).map((pr) => [pr.tipo, String(pr.preco)])),
        });
        setPhotos(p.photos ?? []);
      } catch (e) {
        setError((e as Error).message);
      }
      setLoading(false);
    })();
  }, [id, profile]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleAmenity(a: string) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a)
        ? f.amenities.filter((x) => x !== a)
        : [...f.amenities, a],
    }));
  }

  async function handleUpload(files: FileList) {
    if (!profile) return;
    setUploading(true);
    setError(null);
    try {
      const newPhotos: PropertyPhoto[] = [];
      const startOrdem = photos.length;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const ext = file.name.split('.').pop();
        const path = `${profile.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('property-photos')
          .upload(path, file, { cacheControl: '3600', upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('property-photos').getPublicUrl(path);
        newPhotos.push({
          id: crypto.randomUUID(),
          property_id: id ?? '',
          url: pub.publicUrl,
          ordem: startOrdem + i,
          created_at: new Date().toISOString(),
        });
      }
      setPhotos((prev) => [...prev, ...newPhotos]);
    } catch (e) {
      setError('Erro no upload: ' + (e as Error).message);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removePhoto(p: PropertyPhoto) {
    // Remove from storage if it was just uploaded (no real property_id link yet OR existing)
    const path = p.url.split('/property-photos/')[1];
    if (path) {
      supabase.storage.from('property-photos').remove([path]).then();
    }
    setPhotos((prev) => prev.filter((x) => x.id !== p.id).map((x, i) => ({ ...x, ordem: i })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setSaving(true);

    if (form.titulo.trim().length < 5) { setError('Informe um título com pelo menos 5 caracteres.'); setSaving(false); return; }
    if (!form.cidade.trim() || !form.bairro.trim()) { setError('Cidade e bairro são obrigatórios.'); setSaving(false); return; }
    const hasPricing = Object.values(form.pricing).some((v) => v && Number(v) > 0);
    if (!hasPricing) { setError('Defina pelo menos um tipo de locação com preço.'); setSaving(false); return; }
    if (photos.length === 0) { setError('Adicione pelo menos uma foto do imóvel.'); setSaving(false); return; }

    try {
      let propertyId = id;
      const payload = {
        owner_id: profile.id,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
        cidade: form.cidade.trim(),
        bairro: form.bairro.trim(),
        endereco: form.endereco.trim(),
        quartos: Number(form.quartos),
        banheiros: Number(form.banheiros),
        capacidade: Number(form.capacidade),
        regras: form.regras.trim(),
        politica_cancelamento: form.politica_cancelamento.trim(),
        status: form.status,
      };

      if (isEdit && propertyId) {
        const { error: uErr } = await supabase.from('properties').update(payload).eq('id', propertyId);
        if (uErr) throw uErr;
        // Replace amenities: delete all then reinsert
        await supabase.from('property_amenities').delete().eq('property_id', propertyId);
        // Replace pricing
        await supabase.from('rental_pricing').delete().eq('property_id', propertyId);
        // Replace photos metadata
        await supabase.from('property_photos').delete().eq('property_id', propertyId);
      } else {
        const { data: newProp, error: iErr } = await supabase
          .from('properties')
          .insert(payload)
          .select()
          .single();
        if (iErr) throw iErr;
        propertyId = newProp.id;
      }

      // Insert amenities
      if (form.amenities.length > 0) {
        const { error: aErr } = await supabase
          .from('property_amenities')
          .insert(form.amenities.map((a) => ({ property_id: propertyId, amenity_name: a })));
        if (aErr) throw aErr;
      }

      // Insert pricing
      const pricingRows = RENTAL_TYPES
        .filter((r) => form.pricing[r.id] && Number(form.pricing[r.id]) > 0)
        .map((r) => ({ property_id: propertyId, tipo: r.id, preco: Number(form.pricing[r.id]) }));
      if (pricingRows.length > 0) {
        const { error: pErr } = await supabase.from('rental_pricing').insert(pricingRows);
        if (pErr) throw pErr;
      }

      // Insert photos metadata
      if (photos.length > 0) {
        const { error: phErr } = await supabase
          .from('property_photos')
          .insert(photos.map((p, i) => ({ property_id: propertyId, url: p.url, ordem: i })));
        if (phErr) throw phErr;
      }

      setSavedOk(true);
      setTimeout(() => navigate('/painel/proprietario/imoveis'), 800);
    } catch (e) {
      setError((e as Error).message);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-1">
      <Link to="/painel/proprietario/imoveis" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-emerald-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar aos meus imóveis
      </Link>
      <h1 className="text-2xl font-bold text-stone-900 mb-1">{isEdit ? 'Editar imóvel' : 'Anunciar imóvel'}</h1>
      <p className="text-sm text-stone-500 mb-6">Preencha as informações do seu imóvel para recebê-lo nas buscas.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        {savedOk && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" /> Imóvel salvo! Redirecionando…
          </div>
        )}

        {/* Photos */}
        <section className="card p-6">
          <h2 className="font-semibold text-stone-800 mb-1">Fotos</h2>
          <p className="text-sm text-stone-500 mb-4">Adicione fotos do imóvel. A primeira será a capa.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((p, i) => (
              <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden group bg-stone-100">
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute top-1.5 left-1.5 badge bg-emerald-600 text-white border-emerald-700">Capa</span>}
                <button
                  type="button"
                  onClick={() => removePhoto(p)}
                  className="absolute top-1.5 right-1.5 rounded-full bg-black/60 text-white p-1 opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-xl border-2 border-dashed border-stone-300 flex flex-col items-center justify-center gap-2 text-stone-400 hover:border-emerald-400 hover:text-emerald-600 transition"
            >
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Upload className="h-6 w-6" /><span className="text-xs">Galeria</span></>}
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-xl border-2 border-dashed border-stone-300 flex flex-col items-center justify-center gap-2 text-stone-400 hover:border-emerald-400 hover:text-emerald-600 transition"
            >
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Camera className="h-6 w-6" /><span className="text-xs">Câmera</span></>}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
          {photos.length === 0 && (
            <p className="mt-2 text-xs text-stone-400 flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Adicione pelo menos uma foto.</p>
          )}
        </section>

        {/* Basic info */}
        <section className="card p-6 space-y-4">
          <h2 className="font-semibold text-stone-800">Informações básicas</h2>
          <div>
            <label className="label">Título *</label>
            <input value={form.titulo} onChange={(e) => update('titulo', e.target.value)} className="input" placeholder="Ex: Chalé aconchegante na serra" required />
          </div>
          <div>
            <label className="label">Descrição</label>
            <textarea value={form.descricao} onChange={(e) => update('descricao', e.target.value)} rows={4} className="input resize-y" placeholder="Descreva o imóvel, o que torna especial, proximidades…" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Cidade *</label>
              <input value={form.cidade} onChange={(e) => update('cidade', e.target.value)} className="input" placeholder="Ex: Campos do Jordão" required />
            </div>
            <div>
              <label className="label">Bairro *</label>
              <input value={form.bairro} onChange={(e) => update('bairro', e.target.value)} className="input" placeholder="Ex: Capivari" required />
            </div>
          </div>
          <div>
            <label className="label">Endereço (opcional)</label>
            <input value={form.endereco} onChange={(e) => update('endereco', e.target.value)} className="input" placeholder="Rua, número" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Quartos</label>
              <input type="number" min={0} value={form.quartos} onChange={(e) => update('quartos', Number(e.target.value))} className="input" />
            </div>
            <div>
              <label className="label">Banheiros</label>
              <input type="number" min={0} value={form.banheiros} onChange={(e) => update('banheiros', Number(e.target.value))} className="input" />
            </div>
            <div>
              <label className="label">Hóspedes</label>
              <input type="number" min={1} value={form.capacidade} onChange={(e) => update('capacidade', Number(e.target.value))} className="input" />
            </div>
          </div>
        </section>

        {/* Amenities */}
        <section className="card p-6">
          <h2 className="font-semibold text-stone-800 mb-1">Comodidades</h2>
          <p className="text-sm text-stone-500 mb-4">Selecione o que seu imóvel oferece.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AMENITIES.map((a) => {
              const checked = form.amenities.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAmenity(a.id)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition text-left ${
                    checked ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <AmenityIcon name={a.icon} className="h-4 w-4" />
                  <span className="flex-1">{a.label}</span>
                  {checked && <Check className="h-4 w-4 text-emerald-600" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Pricing */}
        <section className="card p-6">
          <h2 className="font-semibold text-stone-800 mb-1">Tipos de locação e preços</h2>
          <p className="text-sm text-stone-500 mb-4">Marque os tipos que quer oferecer e informe o preço. Pelo menos um é obrigatório.</p>
          <div className="space-y-3">
            {RENTAL_TYPES.map((r) => {
              const enabled = form.pricing[r.id] !== undefined;
              return (
                <div key={r.id} className={`flex items-center gap-3 rounded-xl border p-3 transition ${enabled ? 'border-emerald-300 bg-emerald-50/40' : 'border-stone-200'}`}>
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => {
                        setForm((f) => {
                          const np = { ...f.pricing };
                          if (e.target.checked) np[r.id] = '';
                          else delete np[r.id];
                          return { ...f, pricing: np };
                        });
                      }}
                      className="accent-emerald-600 h-4 w-4"
                    />
                    <span className="text-sm font-medium text-stone-700">{r.label}</span>
                  </label>
                  {enabled && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-stone-500">R$</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.pricing[r.id]}
                        onChange={(e) => setForm((f) => ({ ...f, pricing: { ...f.pricing, [r.id]: e.target.value } }))}
                        className="w-28 rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        placeholder="0,00"
                      />
                      <span className="text-xs text-stone-400">/{r.unit}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Rules & policy */}
        <section className="card p-6 space-y-4">
          <h2 className="font-semibold text-stone-800">Regras e políticas</h2>
          <div>
            <label className="label">Regras da casa</label>
            <textarea value={form.regras} onChange={(e) => update('regras', e.target.value)} rows={3} className="input resize-y" placeholder="Ex: Proibido fumar, não permite festas, check-in após 14h…" />
          </div>
          <div>
            <label className="label">Política de cancelamento</label>
            <textarea value={form.politica_cancelamento} onChange={(e) => update('politica_cancelamento', e.target.value)} rows={2} className="input resize-y" />
          </div>
        </section>

        <section className="card p-5 space-y-3">
          <h2 className="font-semibold text-stone-800">Visibilidade</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => update('status', 'publicado')}
              className={`rounded-xl border-2 p-3 text-left transition ${
                form.status === 'publicado' ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <p className="font-semibold text-sm text-stone-800">Publicado</p>
              <p className="text-xs text-stone-500">Visível na busca pública</p>
            </button>
            <button
              type="button"
              onClick={() => update('status', 'rascunho')}
              className={`rounded-xl border-2 p-3 text-left transition ${
                form.status === 'rascunho' ? 'border-amber-500 bg-amber-50' : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <p className="font-semibold text-sm text-stone-800">Rascunho</p>
              <p className="text-xs text-stone-500">Oculto da busca pública</p>
            </button>
          </div>
        </section>

        <div className="flex gap-3 sticky bottom-4 bg-white/90 backdrop-blur p-3 rounded-xl border border-stone-200 shadow-card">
          <button type="submit" disabled={saving} className="btn-primary flex-1 py-3">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> {isEdit ? 'Salvar alterações' : 'Salvar imóvel'}</>}
          </button>
          <Link to="/painel/proprietario/imoveis" className="btn-outline py-3">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
