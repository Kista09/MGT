import { useEffect, useState } from 'react';
import { findDoctors } from './gemini.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://mgucatech.com';
const PORTAL_TOKEN_KEY = 'mgucatech_client_access_token';

/* ── BookingWizard — driven by published flow nodes ── */
function BookingWizard({ flow, specialty, onBack }) {
  const steps = flow.filter(n => n.type === 'menu' || n.type === 'action');
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [done, setDone] = useState(false);

  const current = steps[stepIdx];

  const choose = (option, outIdx) => {
    const nextAnswers = [...answers, { question: current?.label, answer: option }];
    setAnswers(nextAnswers);

    // Check if this is the emergency node
    if (current?.label?.toLowerCase().includes('emergency') && option.toLowerCase().includes('er')) {
      setDone('emergency');
      return;
    }

    if (stepIdx + 1 >= steps.length) {
      setDone('booked');
    } else {
      setStepIdx(stepIdx + 1);
    }
  };

  const accent = '#E8561A';
  const bg = '#0d1b2a';

  if (done === 'emergency') return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🚨</div>
        <h2 style={{ color: '#ff4d4d', fontFamily: "'Playfair Display', serif", fontSize: 28, marginBottom: 12 }}>Go to Emergency</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>Please call <strong style={{ color: '#fff' }}>10177</strong> or go to your nearest Emergency Room immediately.</p>
        <button onClick={onBack} style={{ marginTop: 24, padding: '12px 28px', borderRadius: 10, border: 'none', background: accent, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>← Back</button>
      </div>
    </div>
  );

  if (done === 'booked') return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: '#00c8a0', fontFamily: "'Playfair Display', serif", fontSize: 28, marginBottom: 12 }}>Booking Confirmed</h2>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 20, marginBottom: 20, textAlign: 'left' }}>
          {answers.map((a, i) => (
            <div key={i} style={{ marginBottom: 10, fontSize: 13 }}>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{a.question}</div>
              <div style={{ color: '#e8e8e8', fontWeight: 600 }}>{a.answer}</div>
            </div>
          ))}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>We'll WhatsApp you a confirmation shortly.</p>
        <button onClick={onBack} style={{ marginTop: 16, padding: '12px 28px', borderRadius: 10, border: 'none', background: accent, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Book Another</button>
      </div>
    </div>
  );

  if (!current) return null;

  const options = current.options || [];
  const progress = steps.length > 0 ? (stepIdx / steps.length) * 100 : 0;

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'rgba(0,0,0,0.4)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${accent}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(232,86,26,0.15)', border: '1.5px solid rgba(232,86,26,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏥</div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{specialty || 'Medical'}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Step {stepIdx + 1} / {steps.length}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {stepIdx > 0 && (
            <button onClick={() => { setStepIdx(stepIdx - 1); setAnswers(answers.slice(0, -1)); }}
              style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 16 }}>←</button>
          )}
          <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>✕</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.08)' }}>
        <div style={{ height: '100%', background: accent, width: `${progress}%`, transition: 'width .3s' }} />
      </div>

      {/* Previous answers */}
      {answers.length > 0 && (
        <div style={{ padding: '14px 20px 0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {answers.map((a, i) => (
            <span key={i} style={{ background: 'rgba(232,86,26,0.12)', border: '1px solid rgba(232,86,26,0.25)', borderRadius: 99, padding: '3px 12px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              <span style={{ color: accent }}>✓</span> {a.answer}
            </span>
          ))}
        </div>
      )}

      {/* Question */}
      <div style={{ padding: '28px 20px 16px' }}>
        <h2 style={{ color: '#fff', fontSize: 22, fontFamily: "'Playfair Display', serif", fontWeight: 700, marginBottom: 4 }}>{current.content || current.label}</h2>
      </div>

      {/* Options */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {options.map((opt, i) => (
          <button key={i} onClick={() => choose(opt, i)}
            style={{ padding: '16px 18px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#e8e8e8', fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.background = 'rgba(232,86,26,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', border: `1.5px solid rgba(255,255,255,0.25)`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
            {opt}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
          Select an option above…
        </div>
      </div>
    </div>
  );
}

const SPECIALTIES = [
  'Any Doctor', 'GP', 'General Practitioner', 'Cardiologist', 'Dermatologist',
  'Neurologist', 'Orthopedic', 'Pediatrician', 'Psychiatrist', 'Dentist', 'Eye Doctor',
];

const CITY_SUBURBS = {
  'Cape Town': [
    'Athlone', 'Bloubergstrand', 'Blue Downs', 'Bothasig', 'Brackenfell',
    'Camps Bay', 'Century City', 'Claremont', 'Constantia', 'De Waterkant',
    'Durbanville', 'Edgemead', 'Eerste River', 'Elsies River', 'Firgrove',
    'Gardens', 'Goodwood', 'Green Point', 'Grassy Park', 'Hout Bay',
    'Kenilworth', 'Kraaifontein', 'Kuils River', 'Lansdowne', 'Llandudno',
    'Maitland', 'Melkbosstrand', 'Milnerton', 'Mitchells Plain',
    'Monte Vista', 'Montague Gardens', 'Mowbray', 'Muizenberg', 'Newlands',
    'Observatory', 'Paarden Eiland', 'Panorama', 'Parow', 'Parklands',
    'Pinelands', 'Plumstead', 'Rondebosch', 'Rosebank', 'Salt River',
    'Sea Point', 'Simonstown', 'Somerset West', 'Stellenbosch',
    'Strand', 'Paarl', 'Sunset Beach', 'Table View', 'Thornton',
    'Tyger Valley', 'Woodstock', 'Wynberg', 'Ysterplaat',
  ],
  'Johannesburg': [
    'Sandton', 'Rosebank', 'Braamfontein', 'Parktown', 'Hyde Park',
    'Melville', 'Northcliff', 'Randburg', 'Roodepoort', 'Midrand',
    'Alexandra', 'Soweto', 'Edenvale', 'Germiston', 'Boksburg', 'Benoni',
    'Ferndale', 'Fourways', 'Sunninghill', 'Rivonia',
  ],
  'Pretoria': [
    'Hatfield', 'Sunnyside', 'Arcadia', 'Brooklyn', 'Lynnwood',
    'Menlyn', 'Garsfontein', 'Faerie Glen', 'Centurion', 'Silverton',
    'Mamelodi', 'Atteridgeville',
  ],
  'Durban': [
    'Berea', 'Morningside', 'Musgrave', 'Umhlanga', 'La Lucia',
    'Westville', 'Pinetown', 'Chatsworth', 'Umlazi', 'KwaMashu',
    'Tongaat', 'Ballito', 'Amanzimtoti',
  ],
  'Gqeberha (Port Elizabeth)': [
    'Central', 'Newton Park', 'Summerstrand', 'Walmer', 'Mill Park',
    'Humewood', 'Greenacres', 'Uitenhage',
  ],
  'Bloemfontein': [
    'Westdene', 'Universitas', 'Brandwag', 'Fichardt Park',
    'Langenhoven Park', 'Heidedal', 'Mangaung',
  ],
  'East London': [
    'Quigney', 'Beacon Bay', 'Gonubie', 'Cambridge', 'Mdantsane',
    'Nahoon', 'Berea', 'Vincent',
  ],
  'Polokwane': [
    'Bendor', 'Flora Park', 'Ivy Park', 'Welgelegen', 'Seshego',
  ],
  'Nelspruit (Mbombela)': [
    'Sonheuwel', 'West Acres', 'Riverside Park', 'Tekwane',
  ],
};

const CITIES = Object.keys(CITY_SUBURBS);

/* ── shared styles ── */
const panel = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 20, padding: 24, marginBottom: 16,
};
const labelCss = {
  fontSize: 11, color: 'rgba(255,255,255,0.35)',
  textTransform: 'uppercase', letterSpacing: 1,
  display: 'block', marginBottom: 8,
};
const inputCss = {
  width: '100%', padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#e8e8e8', fontSize: 14, fontFamily: "'DM Sans', sans-serif",
  outline: 'none',
};
const selectCss = { ...inputCss, cursor: 'pointer' };
const linkBtn = {
  marginTop: 8, background: 'none', border: 'none',
  color: 'rgba(255,255,255,0.3)', fontSize: 12,
  cursor: 'pointer', padding: 0, textDecoration: 'underline',
};

/* ── PulseRing ── */
function PulseRing() {
  return (
    <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 24px' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '2px solid #00c8a0',
          animation: `ping 1.8s ease-out ${i * 0.6}s infinite`, opacity: 0,
        }} />
      ))}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 36, height: 36, borderRadius: '50%',
        background: 'linear-gradient(135deg,#00c8a0,#007aff)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      }}>🩺</div>
    </div>
  );
}

/* ── DoctorCard ── */
function DoctorCard({ doc, index }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, padding: '20px 22px', marginBottom: 12,
      animation: `fadeUp 0.4s ease ${index * 0.07}s both`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, paddingRight: 12 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: '#f0f0f0', fontWeight: 600 }}>
            {doc.name}
          </div>
          <div style={{ fontSize: 13, color: '#00c8a0', marginTop: 4, fontWeight: 500 }}>
            {doc.specialty}
          </div>
        </div>
        {doc.rating && (
          <div style={{
            background: 'rgba(0,200,160,0.15)', border: '1px solid rgba(0,200,160,0.3)',
            borderRadius: 20, padding: '4px 10px', fontSize: 13, color: '#00c8a0',
            fontWeight: 600, whiteSpace: 'nowrap',
          }}>★ {doc.rating}</div>
        )}
      </div>
      {doc.address  && <Row icon="📍" text={doc.address} />}
      {doc.phone    && <Row icon="📞" text={doc.phone} />}
      {doc.hours    && <Row icon="🕐" text={doc.hours} />}
      {doc.notes    && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 10, fontStyle: 'italic' }}>
          {doc.notes}
        </div>
      )}
    </div>
  );
}

function Row({ icon, text }) {
  return (
    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 6, display: 'flex', gap: 6 }}>
      <span>{icon}</span><span>{text}</span>
    </div>
  );
}

// Fallback medical flow used when no flow is published yet
const MEDICAL_BOOKING_NODES_FALLBACK = [
  { id:"start", type:"start", label:"Start", content:"", outputs:["q1"] },
  { id:"q1",  type:"menu", label:"Reason for visit",      content:"What brings you in today?",         options:["Symptoms / illness","Routine checkup","Prescription refill","Other"],    outputs:["q2","q2","q2","q2"] },
  { id:"q2",  type:"menu", label:"Emergency check",       content:"Is this an emergency?",              options:["Emergency — go to ER","Not an emergency"],                              outputs:["er","q3"] },
  { id:"er",  type:"action",label:"Emergency — go to ER", content:"Call 10177 or go to the nearest ER.", outputs:[] },
  { id:"q3",  type:"menu", label:"Symptom duration",      content:"How long have you had this?",        options:["Just started","A few days","A week or more","Ongoing / chronic"],      outputs:["q4","q4","q4","q4"] },
  { id:"q4",  type:"menu", label:"Previous visit",        content:"Have you seen a doctor for this before?", options:["Yes — same issue","No — first time","Yes — different issue"],    outputs:["q5","q5","q5"] },
  { id:"q5",  type:"menu", label:"Current medications",   content:"Are you currently taking any medications?", options:["None","Yes — have my details","Yes — I'll provide details"],  outputs:["q6","q6","q6"] },
  { id:"q6",  type:"menu", label:"Visit type",            content:"How would you like your consultation?", options:["In person","Video call","Phone call"],                              outputs:["q7","q7","q7"] },
  { id:"q7",  type:"menu", label:"Doctor preference",     content:"Any doctor preference?",              options:["Any available","Specific doctor","Female doctor","Male doctor"],      outputs:["q8","q8","q8","q8"] },
  { id:"q8",  type:"menu", label:"Appointment timing",    content:"When do you need the appointment?",   options:["Today / ASAP","Tomorrow","This week","Any time"],                    outputs:["q9","q9","q9","q9"] },
  { id:"q9",  type:"menu", label:"Preferred time of day", content:"Preferred time of day?",              options:["Morning (8am–12pm)","Afternoon (12–5pm)","Evening (5–7pm)"],         outputs:["done","done","done"] },
  { id:"done",type:"end",  label:"Done",                  content:"", outputs:[] },
];

/* ── Main App ── */
export default function App() {
  // All hooks declared unconditionally
  const [bookingMode, setBookingMode] = useState(() => window.location.hash === '#book' || new URLSearchParams(window.location.search).has('clientId'));
  const [bookingFlow, setBookingFlow] = useState([]);
  const [bookingSpecialty, setBookingSpecialty] = useState('Medical');
  const [city,    setCity]    = useState('');
  const [suburb,  setSuburb]  = useState('');
  const [street,  setStreet]  = useState('');
  const [locked,  setLocked]  = useState(false);
  const [specialty, setSpecialty] = useState('Any Doctor');
  const [radius,    setRadius]    = useState('5');
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // Fetch published booking flow when in booking mode
  useEffect(() => {
    if (!bookingMode) return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('client')) setBookingSpecialty(sp.get('client'));
    const token = localStorage.getItem(PORTAL_TOKEN_KEY) || '';
    fetch(`${API_BASE}/api/client-portal`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then(data => {
        const flow = data?.workspace?.bookingFlow;
        if (Array.isArray(flow) && flow.length > 0) setBookingFlow(flow);
      });
  }, [bookingMode]);

  if (bookingMode) {
    const activeFlow = bookingFlow.length > 0 ? bookingFlow : MEDICAL_BOOKING_NODES_FALLBACK;
    return <BookingWizard flow={activeFlow} specialty={bookingSpecialty} onBack={() => setBookingMode(false)} />;
  }

  const suburbs = city ? (CITY_SUBURBS[city] || []) : [];
  const fullAddress = [street.trim(), suburb, city].filter(Boolean).join(', ');
  const canSearch = locked && city;

  const confirmLocation = () => {
    if (!city) return;
    setLocked(true);
    setDoctors([]);
    setError(null);
  };

  const changeLocation = () => {
    setLocked(false);
    setDoctors([]);
    setError(null);
  };

  const handleCityChange = (val) => {
    setCity(val);
    setSuburb('');
    setLocked(false);
  };

  const search = async () => {
    if (!canSearch) return;
    setLoading(true); setError(null); setDoctors([]);
    try {
      const location = { city, suburb, street: street.trim() };
      const results = await findDoctors(location, fullAddress, specialty, radius);
      results.length === 0
        ? setError('No results found. Try a larger radius or different specialty.')
        : setDoctors(results);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Glow */}
      <div style={{
        position: 'fixed', top: '10%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(0,200,160,0.07) 0%, transparent 70%)',
      }} />

      <div style={{ width: '100%', maxWidth: 560, position: 'relative' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <PulseRing />
          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 700,
            background: 'linear-gradient(135deg, #fff 30%, #00c8a0)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 8px',
          }}>NearbyDoc</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            Find trusted doctors in your neighbourhood
          </p>
        </div>

        {/* Location */}
        <div style={panel}>
          <span style={labelCss}>Your Location</span>

          {locked ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00c8a0', boxShadow: '0 0 8px #00c8a0', flexShrink: 0 }} />
                <span style={{ color: '#00c8a0', fontWeight: 500, fontSize: 14 }}>{fullAddress}</span>
              </div>
              <button onClick={changeLocation} style={linkBtn}>Change location</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* City */}
              <div>
                <label style={labelCss}>City</label>
                <select value={city} onChange={e => handleCityChange(e.target.value)} style={selectCss}>
                  <option value="">— Select city —</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Suburb */}
              <div>
                <label style={labelCss}>Suburb</label>
                <select
                  value={suburb}
                  onChange={e => setSuburb(e.target.value)}
                  style={selectCss}
                >
                  <option value="">— Select suburb —</option>
                  {suburbs.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Street */}
              <div>
                <label style={labelCss}>Street <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>(optional)</span></label>
                <input
                  type="text"
                  value={street}
                  onChange={e => setStreet(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && city && confirmLocation()}
                  placeholder="e.g. 12 Main Road"
                  style={inputCss}
                />
              </div>

              <button
                onClick={confirmLocation}
                disabled={!city}
                style={{
                  padding: '11px 0', borderRadius: 10, border: 'none',
                  background: city ? 'linear-gradient(135deg,#00c8a0,#007aff)' : 'rgba(255,255,255,0.06)',
                  color: city ? '#fff' : 'rgba(255,255,255,0.3)',
                  fontSize: 14, fontWeight: 600, cursor: city ? 'pointer' : 'default',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Confirm Location →
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div style={{ ...panel, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 160 }}>
            <label style={labelCss}>Specialty</label>
            <select value={specialty} onChange={e => setSpecialty(e.target.value)} style={selectCss}>
              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 100 }}>
            <label style={labelCss}>Radius</label>
            <select value={radius} onChange={e => setRadius(e.target.value)} style={selectCss}>
              {['2', '5', '10', '20'].map(r => <option key={r} value={r}>{r} km</option>)}
            </select>
          </div>
        </div>

        {/* Search */}
        <button onClick={search} disabled={loading || !canSearch} style={{
          width: '100%', padding: '16px 0', borderRadius: 14, marginBottom: 24,
          background: (!canSearch || loading) ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#00c8a0,#007aff)',
          border: 'none', color: (!canSearch || loading) ? 'rgba(255,255,255,0.3)' : '#fff',
          fontSize: 16, fontWeight: 600, cursor: (!canSearch || loading) ? 'default' : 'pointer',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
              Searching…
            </span>
          ) : '🔍 Find Doctors Near Me'}
        </button>

        {error && (
          <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 12, padding: '14px 18px', color: '#ff9999', fontSize: 14, marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        {doctors.length > 0 && (
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
              {doctors.length} results near {suburb || city}
            </div>
            {doctors.map((doc, i) => <DoctorCard key={`${doc.name}-${i}`} doc={doc} index={i} />)}
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 16 }}>
              {doctors[0]?.source === 'osm' ? '📍 Real data from OpenStreetMap · Verify hours before visiting' : '🤖 AI-generated · Always verify before visiting'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
