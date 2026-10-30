import React from 'react';
import Header from './components/Header.jsx';
import PersonalInfoForm from './components/PersonalInfoForm.jsx';
import './styles/form.css';

export default function App() {
  return (
    <main className="app-container">
      <Header />
      <PersonalInfoForm />
    </main>
  );
}
