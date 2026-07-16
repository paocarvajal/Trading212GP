import React, { useState, useEffect, useMemo } from 'react';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Globe, Crosshair, Briefcase, TrendingUp, TrendingDown, Clock, PieChart as PieIcon, LogOut, Search, Plus, DownloadCloud, AlertTriangle } from 'lucide-react';
import './App.css';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
const TABS = { MACRO: 'macro', SCREENER: 'screener', PORTFOLIO: 'portfolio' };

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.PORTFOLIO);
  
  // Portfolio State
  const [portfolioData, setPortfolioData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('investment');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [newTrade, setNewTrade] = useState({ ACCION: '', COMPRA: '', PRECIO: '', ACCIONES: '' });

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  // Firestore Real-time Listener (Portfolio)
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'portfolio'), (snapshot) => {
      const data = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      
      const cleanedData = data.filter(r => r.ACCION).map(row => ({
        ...row,
        investmentNum: Number(row[' INVERSION']) || (Number(row.PRECIO || row['COMPRA.1']) * Number(row.ACCIONES)),
        daysNum: Number(row['DIAS EN CARTERA']) || 0
      }));
      setPortfolioData(cleanedData);
    });
    return () => unsubscribe();
  }, [user]);

  const signIn = async () => {
    try { await signInWithPopup(auth, googleProvider); } 
    catch (error) { alert("Error: " + error.message); }
  };

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const res = await fetch('/portfolio.json');
      const data = await res.json();
      const batch = writeBatch(db);
      const validData = data.filter(row => row.ACCION);
      
      validData.forEach((row, index) => {
        const docRef = doc(collection(db, 'portfolio'), `trade_${index}`);
        batch.set(docRef, row);
      });
      await batch.commit();
      alert('¡Migración exitosa a Firestore! ' + validData.length + ' registros recuperados.');
    } catch (e) {
      alert('Error en migración: ' + e.message);
    }
    setMigrating(false);
  };

  const handleAddTrade = async (e) => {
    e.preventDefault();
    try {
      const inversion = Number(newTrade.PRECIO) * Number(newTrade.ACCIONES);
      const tradeDoc = {
        ACCION: newTrade.ACCION.toUpperCase(),
        COMPRA: newTrade.COMPRA,
        PRECIO: Number(newTrade.PRECIO),
        ACCIONES: Number(newTrade.ACCIONES),
        ' INVERSION': inversion,
        'DIAS EN CARTERA': 0,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(collection(db, 'portfolio'), `trade_${Date.now()}`), tradeDoc);
      setIsModalOpen(false);
      setNewTrade({ ACCION: '', COMPRA: '', PRECIO: '', ACCIONES: '' });
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // KPIs & Chart Data
  const totalInvestment = useMemo(() => portfolioData.reduce((sum, item) => sum + item.investmentNum, 0), [portfolioData]);
  const chartData = useMemo(() => {
    const grouped = portfolioData.reduce((acc, curr) => {
      acc[curr.ACCION] = (acc[curr.ACCION] || 0) + curr.investmentNum;
      return acc;
    }, {});
    return Object.entries(grouped).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [portfolioData]);

  const filteredData = useMemo(() => {
    let result = portfolioData.filter(item => item.ACCION.toLowerCase().includes(searchTerm.toLowerCase()));
    if (sortBy === 'investment') result.sort((a, b) => b.investmentNum - a.investmentNum);
    if (sortBy === 'days') result.sort((a, b) => b.daysNum - a.daysNum);
    if (sortBy === 'recent') result.sort((a, b) => new Date(b.COMPRA) - new Date(a.COMPRA));
    return result;
  }, [portfolioData, searchTerm, sortBy]);


  // ---- RENDERS ----
  if (!user) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1 className="terminal-title" style={{fontSize: '3rem', marginBottom: '1rem'}}>Alpha Terminal v2</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Institutional Grade Intelligence & Portfolio Control</p>
          <button onClick={signIn} className="login-button">Identidad Biométrica / Google</button>
        </div>
      </div>
    );
  }

  const renderMacro = () => (
    <div className="macro-grid">
      <div className="glass-card">
        <h2 style={{display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'1.5rem'}}><Globe size={20} color="#3b82f6"/> Global Market Context</h2>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
           <div className="kpi-box">
             <span className="kpi-label">Market Regime</span>
             <span className="kpi-value" style={{color: 'var(--accent-green)'}}>Risk ON</span>
             <span style={{fontSize:'0.8rem', color:'var(--text-muted)', marginTop:'0.5rem', display:'block'}}>VIX: 13.4 (-2.1%)</span>
           </div>
           <div className="kpi-box">
             <span className="kpi-label">FED Rates (Target)</span>
             <span className="kpi-value">5.25% - 5.50%</span>
             <span style={{fontSize:'0.8rem', color:'var(--text-muted)', marginTop:'0.5rem', display:'block'}}>Próxima reunión: Sept 2026</span>
           </div>
        </div>
        <p style={{marginTop:'1.5rem', color:'var(--text-muted)', lineHeight:'1.6', fontSize:'0.9rem'}}>
          <strong>AI Analysis:</strong> La rotación hacia sectores defensivos se ha pausado tras los recientes datos de inflación CPI, sugiriendo un aterrizaje suave de la economía. El sector tecnológico mantiene impulso por CAPEX en Inteligencia Artificial.
        </p>
      </div>
      <div className="glass-card">
        <h2 style={{display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'1.5rem'}}><AlertTriangle size={20} color="#f59e0b"/> Catalizadores Clave</h2>
        <ul style={{listStyle:'none'}}>
          <li style={{padding:'0.8rem 0', borderBottom:'1px solid var(--glass-border)'}}>
            <span className="badge-red" style={{marginRight:'0.5rem'}}>Geopolítica</span> Tensiones comerciales EE.UU / China por semiconductores.
          </li>
          <li style={{padding:'0.8rem 0', borderBottom:'1px solid var(--glass-border)'}}>
            <span className="badge-green" style={{marginRight:'0.5rem'}}>Earnings</span> Temporada Q2 arranca con bancos superando estimaciones.
          </li>
        </ul>
      </div>
    </div>
  );

  const renderScreener = () => (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
        <h2 style={{display:'flex', alignItems:'center', gap:'0.5rem'}}><Crosshair size={24} color="#10b981"/> Daily AI Alpha Picks</h2>
        <span style={{background:'rgba(16,185,129,0.1)', color:'#10b981', padding:'0.4rem 1rem', borderRadius:'20px', fontSize:'0.85rem', fontWeight:'600'}}>Actualizado Hoy 8:00 AM</span>
      </div>
      
      <div className="screener-grid">
        {/* Card 1 */}
        <div className="glass-card">
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1rem'}}>
            <span className="ticker-badge" style={{fontSize:'1.2rem'}}>GOOGL</span>
            <span className="badge-green">Horizonte: Largo Plazo</span>
          </div>
          <h3 style={{marginBottom:'1rem', fontSize:'1.1rem'}}>Alphabet Inc.</h3>
          
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem', marginBottom:'1rem', background:'rgba(0,0,0,0.2)', padding:'1rem', borderRadius:'8px'}}>
            <div><span style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>ROIC</span><br/><strong>28.4%</strong></div>
            <div><span style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>FCF Yield</span><br/><strong>4.2%</strong></div>
            <div><span style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>P/E FWD</span><br/><strong>22.5x</strong></div>
            <div><span style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>Moat</span><br/><strong>Ancho</strong></div>
          </div>
          <p style={{fontSize:'0.85rem', color:'var(--text-muted)'}}>Dominio absoluto en Search e infraestructura Cloud. La valoración actual no refleja totalmente la integración exitosa de Gemini en su ecosistema principal.</p>
        </div>

        {/* Card 2 */}
        <div className="glass-card">
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1rem'}}>
            <span className="ticker-badge" style={{fontSize:'1.2rem'}}>V</span>
            <span className="badge-green">Horizonte: Mediano Plazo</span>
          </div>
          <h3 style={{marginBottom:'1rem', fontSize:'1.1rem'}}>Visa Inc.</h3>
          
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem', marginBottom:'1rem', background:'rgba(0,0,0,0.2)', padding:'1rem', borderRadius:'8px'}}>
            <div><span style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>ROIC</span><br/><strong>45.1%</strong></div>
            <div><span style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>FCF Margin</span><br/><strong>62.0%</strong></div>
            <div><span style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>P/E FWD</span><br/><strong>26.0x</strong></div>
            <div><span style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>Moat</span><br/><strong>Network</strong></div>
          </div>
          <p style={{fontSize:'0.85rem', color:'var(--text-muted)'}}>Márgenes operativos supremos y efecto red inquebrantable. Excelente protección contra inflación ya que sus ingresos crecen con el volumen nominal transaccionado.</p>
        </div>
      </div>
    </div>
  );

  const renderPortfolio = () => (
    <>
      <div className="kpi-grid">
        <div className="kpi-box">
          <span className="kpi-label"><Briefcase size={16}/> Capital Asignado</span>
          <span className="kpi-value">${totalInvestment.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
        </div>
        <div className="kpi-box">
          <span className="kpi-label"><PieIcon size={16}/> Posiciones Únicas</span>
          <span className="kpi-value">{chartData.length}</span>
        </div>
        <div className="kpi-box">
          <span className="kpi-label"><TrendingUp size={16}/> Top Holding</span>
          <span className="kpi-value">{chartData.length > 0 ? chartData[0].name : 'N/A'}</span>
        </div>
      </div>

      {portfolioData.length === 0 ? (
         <div className="glass-card" style={{textAlign:'center', padding:'4rem 2rem'}}>
            <DownloadCloud size={48} color="var(--text-muted)" style={{marginBottom:'1rem'}}/>
            <h2>Base de Datos Vacía</h2>
            <p style={{color: 'var(--text-muted)', marginBottom:'2rem', marginTop:'0.5rem'}}>Es necesario realizar la ingesta inicial de datos del archivo Excel.</p>
            <button className="btn-primary" onClick={handleMigrate} disabled={migrating}>
              {migrating ? 'Sincronizando...' : 'Ejecutar Migración de Excel a Firestore'}
            </button>
         </div>
      ) : (
        <>
          <div className="glass-card" style={{ display: 'flex', gap: '2rem', height: '250px' }}>
            <div style={{ flex: 1 }}>
                <h3 style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase'}}>Distribución de Capital</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie data={chartData} innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} contentStyle={{background: '#0f1420', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff'}} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div style={{ flex: 2 }}>
                <h3 style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase'}}>Exposure per Asset</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <XAxis dataKey="name" stroke="#8b9bb4" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{fill: 'rgba(255,255,255,0.03)'}} formatter={(value) => `$${value.toFixed(2)}`} contentStyle={{background: '#0f1420', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px'}}/>
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card">
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem'}}>
              <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                <div style={{position: 'relative'}}>
                  <Search size={16} style={{position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)'}} />
                  <input type="text" placeholder="Buscar Ticker..." className="input-glass" style={{paddingLeft: '2.5rem'}}
                         value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <select className="input-glass" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="investment">Sort: Exposure (High to Low)</option>
                  <option value="days">Sort: Days Held</option>
                  <option value="recent">Sort: Most Recent</option>
                </select>
              </div>
              <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                <Plus size={18} /> New Trade
              </button>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Acción</th>
                            <th>Fecha</th>
                            <th>Precio Compra</th>
                            <th>Acciones</th>
                            <th>Capital Invertido</th>
                            <th>Días en Cartera</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((row) => (
                            <tr key={row.id}>
                                <td><span className="ticker-badge">{row.ACCION}</span></td>
                                <td>{String(row.COMPRA).substring(0,10)}</td>
                                <td className="numeric">${Number(row.PRECIO || row['COMPRA.1'] || 0).toFixed(2)}</td>
                                <td className="numeric">{Number(row.ACCIONES).toFixed(3)}</td>
                                <td className="numeric" style={{color: 'var(--accent-blue)', fontWeight: 'bold'}}>${row.investmentNum.toFixed(2)}</td>
                                <td>{row.daysNum}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{marginBottom: '1.5rem', fontSize:'1.2rem'}}>Trade Execution</h2>
            <form onSubmit={handleAddTrade}>
              <div style={{marginBottom:'1rem'}}>
                <label style={{display:'block', fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:'0.3rem'}}>Ticker Symbol</label>
                <input type="text" required className="input-glass" style={{width:'100%'}} placeholder="e.g. MSFT" value={newTrade.ACCION} onChange={e => setNewTrade({...newTrade, ACCION: e.target.value})} />
              </div>
              <div style={{marginBottom:'1rem'}}>
                <label style={{display:'block', fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:'0.3rem'}}>Trade Date</label>
                <input type="date" required className="input-glass" style={{width:'100%'}} value={newTrade.COMPRA} onChange={e => setNewTrade({...newTrade, COMPRA: e.target.value})} />
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom:'1.5rem'}}>
                  <div>
                    <label style={{display:'block', fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:'0.3rem'}}>Fill Price ($)</label>
                    <input type="number" step="0.01" required className="input-glass" style={{width:'100%'}} value={newTrade.PRECIO} onChange={e => setNewTrade({...newTrade, PRECIO: e.target.value})} />
                  </div>
                  <div>
                    <label style={{display:'block', fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:'0.3rem'}}>Quantity</label>
                    <input type="number" step="0.0001" required className="input-glass" style={{width:'100%'}} value={newTrade.ACCIONES} onChange={e => setNewTrade({...newTrade, ACCIONES: e.target.value})} />
                  </div>
              </div>
              <div style={{display:'flex', justifyContent:'flex-end', gap:'1rem'}}>
                <button type="button" className="btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Execute Trade</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );


  return (
    <div className="dashboard-layout">
      <header>
        <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
          <div style={{width:'40px', height:'40px', background:'var(--accent-blue)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center'}}>
            <Briefcase color="#fff" size={20}/>
          </div>
          <div>
            <h1 className="terminal-title">Alpha Terminal</h1>
            <div className="subtitle">Institutional Portfolio & Market Intelligence</div>
          </div>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem'}}>
          <div style={{textAlign:'right'}}>
            <div style={{color: '#fff', fontSize: '0.9rem', fontWeight:'600'}}>{user.displayName}</div>
            <div style={{color: 'var(--text-muted)', fontSize: '0.75rem'}}>{user.email}</div>
          </div>
          <button onClick={() => signOut(auth)} className="logout-button"><LogOut size={16} /></button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="tabs-nav">
        <button className={`tab-button ${activeTab === TABS.MACRO ? 'active' : ''}`} onClick={() => setActiveTab(TABS.MACRO)}>
          <Globe size={18}/> Global Macro
        </button>
        <button className={`tab-button ${activeTab === TABS.SCREENER ? 'active' : ''}`} onClick={() => setActiveTab(TABS.SCREENER)}>
          <Crosshair size={18}/> AI Screener
        </button>
        <button className={`tab-button ${activeTab === TABS.PORTFOLIO ? 'active' : ''}`} onClick={() => setActiveTab(TABS.PORTFOLIO)}>
          <Briefcase size={18}/> Portfolio Tracker
        </button>
      </div>

      {/* Render Active Tab */}
      <main>
        {activeTab === TABS.MACRO && renderMacro()}
        {activeTab === TABS.SCREENER && renderScreener()}
        {activeTab === TABS.PORTFOLIO && renderPortfolio()}
      </main>

    </div>
  );
}

export default App;
