import React, { useState, useEffect, useMemo } from 'react';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Search, Plus, TrendingUp, TrendingDown, Clock, PieChart as PieIcon, LogOut, Briefcase } from 'lucide-react';
import './App.css';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

function App() {
  const [user, setUser] = useState(null);
  const [portfolioData, setPortfolioData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('investment');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Trade Form State
  const [newTrade, setNewTrade] = useState({
    ACCION: '', COMPRA: '', PRECIO: '', ACCIONES: ''
  });

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Real-time Listener
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'portfolio'), (snapshot) => {
      const data = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      
      // Clean and normalize legacy excel data
      const cleanedData = data.filter(r => r.ACCION).map(row => ({
        ...row,
        investmentNum: Number(row[' INVERSION']) || (Number(row.PRECIO || row['COMPRA.1']) * Number(row.ACCIONES)),
        daysNum: Number(row['DIAS EN CARTERA']) || 0
      }));
      setPortfolioData(cleanedData);
    });
    return () => unsubscribe();
  }, [user]);

  // Auth Handlers
  const signIn = async () => {
    try { await signInWithPopup(auth, googleProvider); } 
    catch (error) { alert("Error al iniciar sesión: " + error.message); }
  };
  const logOut = async () => signOut(auth);

  // KPIs Calculation
  const totalInvestment = useMemo(() => {
    return portfolioData.reduce((sum, item) => sum + item.investmentNum, 0);
  }, [portfolioData]);

  // Chart Data preparation
  const chartData = useMemo(() => {
    // Group by Ticker to avoid duplicates in pie chart if there are multiple buys
    const grouped = portfolioData.reduce((acc, curr) => {
      acc[curr.ACCION] = (acc[curr.ACCION] || 0) + curr.investmentNum;
      return acc;
    }, {});
    return Object.entries(grouped).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [portfolioData]);

  // Filter and Sort Table
  const filteredData = useMemo(() => {
    let result = portfolioData.filter(item => 
      item.ACCION.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (sortBy === 'investment') result.sort((a, b) => b.investmentNum - a.investmentNum);
    if (sortBy === 'days') result.sort((a, b) => b.daysNum - a.daysNum);
    if (sortBy === 'recent') result.sort((a, b) => new Date(b.COMPRA) - new Date(a.COMPRA));
    return result;
  }, [portfolioData, searchTerm, sortBy]);

  // Handle New Trade Submit
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
        'DIAS EN CARTERA': 0, // Inicia en 0
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(collection(db, 'portfolio'), `trade_${Date.now()}`), tradeDoc);
      setIsModalOpen(false);
      setNewTrade({ ACCION: '', COMPRA: '', PRECIO: '', ACCIONES: '' });
    } catch (err) {
      alert("Error guardando operación: " + err.message);
    }
  };

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1 style={{ fontSize: '2.5rem', background: 'linear-gradient(to right, #60a5fa, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '1rem' }}>Alpha Terminal</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Plataforma Directiva de Inversión Inteligente</p>
          <button onClick={signIn} className="login-button">
            Continuar con Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Header */}
      <header>
        <div>
          <h1 style={{ background: 'linear-gradient(to right, #60a5fa, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Alpha Terminal</h1>
          <div className="subtitle">Nivel Directivo: Análisis de Riesgo & Inteligencia de Mercado</div>
        </div>
        <div style={{textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <div style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>{user.email}</div>
          <button onClick={logOut} className="logout-button"><LogOut size={16} /></button>
        </div>
      </header>

      {/* Global KPIs */}
      <div className="kpi-grid">
        <div className="kpi-box">
          <span className="kpi-label"><Briefcase size={16}/> Exposición Total</span>
          <span className="kpi-value">${totalInvestment.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
        </div>
        <div className="kpi-box">
          <span className="kpi-label"><PieIcon size={16}/> Posiciones Activas</span>
          <span className="kpi-value">{chartData.length}</span>
        </div>
        <div className="kpi-box">
          <span className="kpi-label"><TrendingUp size={16}/> Top Holding</span>
          <span className="kpi-value">{chartData.length > 0 ? chartData[0].name : 'N/A'}</span>
        </div>
      </div>

      <div className="dashboard-grid">
        
        {/* Left Col: Portfolio & Data */}
        <div style={{ gridColumn: 'span 2' }}>
          
          {/* Charts */}
          <div className="glass-card" style={{ display: 'flex', gap: '2rem', height: '300px' }}>
            <div style={{ flex: 1 }}>
                <h3 style={{fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase'}}>Distribución de Capital</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie data={chartData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                        {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} contentStyle={{background: '#141a29', border: 'none', borderRadius: '8px'}} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div style={{ flex: 2 }}>
                <h3 style={{fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase'}}>Inversión por Activo</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                        <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} formatter={(value) => `$${value.toFixed(2)}`} contentStyle={{background: '#141a29', border: 'none', borderRadius: '8px'}}/>
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
          </div>

          {/* Table & Filters */}
          <div className="glass-card">
            <div className="filters-bar">
              <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                <div style={{position: 'relative'}}>
                  <Search size={16} style={{position: 'absolute', left: '10px', top: '10px', color: '#94a3b8'}} />
                  <input type="text" placeholder="Buscar Ticker..." className="input-glass" style={{paddingLeft: '2.5rem'}}
                         value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <select className="input-glass" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="investment">Ordenar por Inversión</option>
                  <option value="days">Ordenar por Días en Cartera</option>
                  <option value="recent">Compras Recientes</option>
                </select>
              </div>
              <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                <Plus size={18} /> Nueva Operación
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
                            <th>Inversión</th>
                            <th>Días</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((row) => (
                            <tr key={row.id}>
                                <td><span className="ticker-badge">{row.ACCION}</span></td>
                                <td>{String(row.COMPRA).substring(0,10)}</td>
                                <td className="numeric">${Number(row.PRECIO || row['COMPRA.1'] || 0).toFixed(2)}</td>
                                <td className="numeric">{Number(row.ACCIONES).toFixed(3)}</td>
                                <td className="numeric" style={{color: 'var(--accent-green)', fontWeight: 'bold'}}>${row.investmentNum.toFixed(2)}</td>
                                <td>{row.daysNum}</td>
                            </tr>
                        ))}
                        {filteredData.length === 0 && <tr><td colSpan="6" style={{textAlign:'center', padding: '2rem'}}>No hay resultados</td></tr>}
                    </tbody>
                </table>
            </div>
          </div>
        </div>

        {/* Right Col: AI Intel & News */}
        <div style={{ gridColumn: 'span 1' }}>
            <div className="glass-card" style={{ height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem'}}>
                    <h3 style={{fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <TrendingUp size={20} color="#34d399"/> Market Intel (AI)
                    </h3>
                    <span style={{fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '12px'}}>LIVE</span>
                </div>
                <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem', fontStyle: 'italic'}}>
                    * Las noticias reales serán inyectadas automáticamente por la IA a las 8:00 AM cada día.
                </p>

                {/* Mock News Items */}
                <div className="news-item">
                    <div className="news-title">KVUE enfrenta renovado escrutinio legal por Tylenol.</div>
                    <div className="news-meta">
                        <span>Hace 2 horas</span>
                        <span className="sentiment-bearish">Bearish</span>
                    </div>
                </div>
                <div className="news-item">
                    <div className="news-title">NIO reporta récord de entregas en China durante Q2.</div>
                    <div className="news-meta">
                        <span>Hace 5 horas</span>
                        <span className="sentiment-bullish">Bullish</span>
                    </div>
                </div>
                <div className="news-item">
                    <div className="news-title">La FED sugiere recortes de tasas inminentes. Sectores defensivos en rotación.</div>
                    <div className="news-meta">
                        <span>Ayer</span>
                        <span className="sentiment-bullish">Macro</span>
                    </div>
                </div>
            </div>
        </div>

      </div>

      {/* New Trade Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{marginBottom: '1.5rem'}}>Registrar Nueva Operación</h2>
            <form onSubmit={handleAddTrade}>
              <div className="form-group">
                <label>Ticker (Acción)</label>
                <input type="text" required className="input-glass" placeholder="Ej. AAPL" value={newTrade.ACCION} onChange={e => setNewTrade({...newTrade, ACCION: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Fecha de Compra</label>
                <input type="date" required className="input-glass" value={newTrade.COMPRA} onChange={e => setNewTrade({...newTrade, COMPRA: e.target.value})} />
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                  <div className="form-group">
                    <label>Precio de Compra ($)</label>
                    <input type="number" step="0.01" required className="input-glass" placeholder="150.50" value={newTrade.PRECIO} onChange={e => setNewTrade({...newTrade, PRECIO: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Cantidad de Acciones</label>
                    <input type="number" step="0.0001" required className="input-glass" placeholder="2.5" value={newTrade.ACCIONES} onChange={e => setNewTrade({...newTrade, ACCIONES: e.target.value})} />
                  </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar en Firestore</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
