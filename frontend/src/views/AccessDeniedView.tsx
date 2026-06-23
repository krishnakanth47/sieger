import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from 'lucide-react';

export default function AccessDeniedView() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: 24,
      padding: 40,
      textAlign: 'center',
    }}>
      {/* Icon */}
      <div style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: 'rgba(225, 29, 72, 0.1)',
        border: '2px solid rgba(225, 29, 72, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'scale-in 0.3s ease',
      }}>
        <ShieldOff size={36} color="var(--color-fail)" />
      </div>

      {/* Heading */}
      <div>
        <h1 style={{
          fontSize: 24,
          fontWeight: 800,
          color: 'var(--color-text-primary)',
          marginBottom: 8,
          letterSpacing: '-0.02em',
        }}>
          Access Denied
        </h1>
        <p style={{
          fontSize: 14,
          color: 'var(--color-text-muted)',
          maxWidth: 420,
          lineHeight: 1.6,
        }}>
          You do not have permission to access this page.
          Please contact your administrator if you believe this is an error.
        </p>
      </div>

      {/* Back button */}
      <button
        className="btn btn-outline"
        onClick={() => navigate(-1)}
        style={{ gap: 8 }}
      >
        <ArrowLeft size={14} />
        Go Back
      </button>
    </div>
  );
}
