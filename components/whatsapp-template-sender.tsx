import React, { useState } from 'react';

export default function WhatsappTemplateSender() {
  const [phone, setPhone] = useState('');
  const [templateSid, setTemplateSid] = useState('HX6d98a259b100a6d054dd035368def400');
  const [parameters, setParameters] = useState('{"1":"Ejemplo"}');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/whatsapp/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phone,
          template_name: templateSid,
          parameters: JSON.parse(parameters)
        })
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setResult('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSend} style={{maxWidth: 400, margin: '2rem auto', padding: 24, border: '1px solid #ccc', borderRadius: 8}}>
      <h2>Enviar plantilla WhatsApp (Twilio)</h2>
      <label>
        Número destino (+521...):
        <input type="text" value={phone} onChange={e => setPhone(e.target.value)} required style={{width: '100%'}} />
      </label>
      <br />
      <label>
        SID de plantilla:
        <input type="text" value={templateSid} onChange={e => setTemplateSid(e.target.value)} required style={{width: '100%'}} />
      </label>
      <br />
      <label>
        Parámetros (JSON):
        <input type="text" value={parameters} onChange={e => setParameters(e.target.value)} required style={{width: '100%'}} />
      </label>
      <br />
      <button type="submit" disabled={loading} style={{marginTop: 12}}>
        {loading ? 'Enviando...' : 'Enviar'}
      </button>
      {result && (
        <pre style={{marginTop: 16, background: '#f6f6f6', padding: 12, borderRadius: 4}}>{result}</pre>
      )}
    </form>
  );
}
