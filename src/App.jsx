import React, { useState, useEffect } from 'react';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, writeBatch, doc, getDocs } from 'firebase/firestore';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [portfolioData, setPortfolioData] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if(currentUser) {
        fetchPortfolio();
      }
    });
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
      alert("Error al iniciar sesión: " + error.message);
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPortfolio = async () => {
    const querySnapshot = await getDocs(collection(db, 'portfolio'));
    const data = [];
    querySnapshot.forEach((doc) => {
      data.push(doc.data());
    });
    setPortfolioData(data);
  };

  const handleMigrate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/portfolio.json');
      const data = await res.json();
      
      const batch = writeBatch(db);
      // Solo migramos las filas que tienen un Ticker (ACCION)
      const validData = data.filter(row => row.ACCION);
      
      validData.forEach((row, index) => {
        const docRef = doc(collection(db, 'portfolio'), `trade_${index}`);
        batch.set(docRef, row);
      });
      await batch.commit();
      alert('¡Migración exitosa a Firestore! ' + validData.length + ' registros subidos.');
      fetchPortfolio();
    } catch (e) {
      console.error(e);
      alert('Error en la migración: ' + e.message);
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1 style={{ fontSize: '2.5rem', background: 'linear-gradient(to right, #60a5fa, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '1rem' }}>Alpha Terminal</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Inicia sesión de forma segura para acceder a tu cartera colaborativa</p>
          <button onClick={signIn} className="login-button">
            <svg style={{width: '20px', height: '20px', marginRight: '10px'}} viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuar con Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <header>
        <div>
          <h1 style={{ background: 'linear-gradient(to right, #60a5fa, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Alpha Terminal & Portfolio</h1>
          <div className="subtitle">Value Investing & Gestión de Cartera Trading 212</div>
        </div>
        <div style={{textAlign: 'right'}}>
          <div style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>{user.email}</div>
          <button onClick={logOut} className="logout-button">Cerrar Sesión</button>
        </div>
      </header>

      <div className="glass-card">
        <h2>Bienvenido, {user.displayName}</h2>
        <p style={{marginTop: '1rem', color: 'var(--text-muted)'}}>Tu cuenta ha sido verificada. Aquí tienes los datos extraídos de la base de datos Firestore:</p>
        
        {portfolioData.length === 0 ? (
            <div style={{ marginTop: '2rem', padding: '2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{marginBottom: '1rem'}}>Parece que aún no hay datos en tu base de datos de Firebase.</p>
                <button 
                    className="login-button" 
                    onClick={handleMigrate} 
                    disabled={loading}
                    style={{ background: 'var(--accent-blue)', color: 'white' }}
                >
                    {loading ? 'Subiendo datos a Firebase...' : 'Migrar Datos desde Excel (.json)'}
                </button>
            </div>
        ) : (
            <div style={{ marginTop: '2rem', overflowX: 'auto' }}>
                <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
                    <thead>
                        <tr style={{borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)'}}>
                            <th style={{padding: '1rem'}}>Ticker</th>
                            <th style={{padding: '1rem'}}>Inversión</th>
                            <th style={{padding: '1rem'}}>Acciones</th>
                            <th style={{padding: '1rem'}}>Días en Cartera</th>
                        </tr>
                    </thead>
                    <tbody>
                        {portfolioData.map((row, idx) => (
                            <tr key={idx} style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                                <td style={{padding: '1rem', fontWeight: 'bold', color: 'var(--accent-blue)'}}>{row.ACCION}</td>
                                <td style={{padding: '1rem'}}>${Number(row[' INVERSION']).toFixed(2)}</td>
                                <td style={{padding: '1rem'}}>{Number(row.ACCIONES).toFixed(3)}</td>
                                <td style={{padding: '1rem'}}>{row['DIAS EN CARTERA']}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
}

export default App;
