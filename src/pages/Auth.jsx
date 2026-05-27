import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Heartbeat, QrCode, ArrowRight } from "@phosphor-icons/react";
import { Mail, Lock, Eye, EyeOff, Check, X } from "lucide-react";
import gsap from "gsap";
import { AuroraBackground } from "../components/ui/aurora-background";
import Magnetic from "../components/ui/magnetic";
import { FloatingShapes } from "../components/ui/floating-shapes";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const rightPanelRef = useRef(null);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordStrength = (hasMinLength ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNumber ? 1 : 0);

  const validatePassword = (pass) => {
    // Requires at least 8 chars, 1 uppercase, 1 number
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(pass);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!isLogin) {
        if (!firstName.trim() || !lastName.trim()) {
          throw new Error("Por favor, ingresa tu nombre y apellido.");
        }
        if (password !== confirmPassword) {
          throw new Error("Las contraseñas no coinciden.");
        }
        if (!validatePassword(password)) {
          throw new Error("La contraseña debe cumplir con todos los requisitos de seguridad.");
        }
      }

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setMessage("Inicio de sesión exitoso. Redirigiendo...");
        navigate("/dashboard");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
            }
          }
        });
        if (error) throw error;
        setMessage("Registro exitoso. Revisa tu bandeja de entrada para verificar tu cuenta.");
      }
    } catch (err) {
      setError(err.message || "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // GSAP Animation para el formulario derecho (Aceternity styling)
    const elements = rightPanelRef.current.querySelectorAll(".gsap-fade-up");
    gsap.fromTo(
      elements,
      { opacity: 0, y: 30, scale: 0.98 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        stagger: 0.1,
        ease: "back.out(1.2)",
        delay: 0.4
      }
    );
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative bg-[#F4EFEA] font-sans p-4 sm:p-8 overflow-hidden">
      <FloatingShapes />
      <div className="relative z-10 w-full max-w-[900px] group">
        <div className="absolute -inset-2 bg-gradient-to-tr from-secondary/10 to-primary/5 rounded-[3rem] blur-2xl opacity-80"></div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative w-full min-h-[550px] flex flex-col md:flex-row bg-white/50 backdrop-blur-2xl rounded-[2rem] shadow-[0_40px_80px_-20px_rgba(44,37,77,0.2)] overflow-hidden border border-white/70 will-change-transform"
        >
          {/* LADO IZQUIERDO */}
          <div className="relative w-full md:w-1/2 overflow-hidden shadow-[inset_-10px_0_30px_rgba(0,0,0,0.15)] flex flex-col justify-center items-center">
            <AuroraBackground className="absolute inset-0 z-0" showRadialGradient={true} />
            <div className="relative z-10 flex flex-col items-center text-center w-full max-w-sm mt-4 p-10">
              <Magnetic strength={0.4}>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="relative group mb-6 cursor-pointer will-change-transform"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary to-accent blur-md rounded-full scale-[1.2] opacity-60 transition-transform duration-300"></div>
                  <div className="relative p-5 bg-gradient-to-br from-bg-dark/80 to-secondary/80 backdrop-blur-xl rounded-full shadow-xl border border-white/20 overflow-hidden transition-colors duration-300">
                    <motion.div 
                      animate={{ rotateY: [0, 360] }} 
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <QrCode size={48} weight="duotone" className="text-white" />
                    </motion.div>
                  </div>
                </motion.div>
              </Magnetic>
              <motion.h1 
                initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}
                className="text-4xl font-extrabold tracking-tighter text-white mb-3 drop-shadow-md"
              >
                QRide
              </motion.h1>
              <motion.p
                initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}
                className="text-sm text-text-main/90 leading-relaxed px-4 drop-shadow-sm font-medium"
              >
                Tu identidad vital siempre contigo. Acceso médico inmediato y control total sobre tu información personal.
              </motion.p>
              <Magnetic strength={0.2}>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  whileHover={{ scale: 1.02 }}
                  className="mt-8 p-3 bg-white/10 border border-white/20 backdrop-blur-md rounded-xl w-[90%] flex items-center gap-4 shadow-lg hover:bg-white/20 transition-all cursor-pointer will-change-transform mx-auto"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-success to-emerald-700 rounded-full flex items-center justify-center shadow-md">
                    <Heartbeat size={20} weight="bold" className="text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="h-2 w-20 bg-white/50 rounded-full mb-2"></div>
                    <div className="h-1.5 w-28 bg-white/20 rounded-full"></div>
                  </div>
                  <div className="p-1.5 bg-white/10 rounded-full border border-white/10">
                    <ArrowRight size={14} className="text-white/80" />
                  </div>
                </motion.div>
              </Magnetic>
            </div>
          </div>

          {/* LADO DERECHO */}
          <div className="w-full md:w-1/2 flex flex-col justify-center p-8 sm:p-12 lg:p-16 relative bg-bg-light">
            <div ref={rightPanelRef} className="w-full max-w-sm mx-auto relative z-10">
              <div className="mb-8 gsap-fade-up">
                <h2 className="text-4xl font-extrabold text-secondary mb-2 tracking-tight">
                  {isLogin ? "Bienvenido" : "Crear Cuenta"}
                </h2>
                <p className="text-[0.9rem] font-medium text-gray-500">
                  {isLogin ? "Ingresa a tu portal de salud inteligente." : "Únete a QRide y lleva tu identidad vital siempre contigo."}
                </p>

                {error && (
                  <div className="mt-4 p-3 bg-red-50/50 border border-red-200 rounded-xl text-sm font-semibold text-red-600">
                    {error}
                  </div>
                )}
                {message && (
                  <div className="mt-4 p-3 bg-green-50/50 border border-green-200 rounded-xl text-sm font-semibold text-green-600">
                    {message}
                  </div>
                )}
              </div>

              <form className="space-y-5" onSubmit={handleAuth}>
                {!isLogin && (
                  <div className="flex gap-4 gsap-fade-up">
                    <div className="space-y-2 w-1/2">
                      <label className="text-[0.85rem] font-bold text-secondary ml-1 uppercase tracking-wider">Nombre(s)</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required={!isLogin}
                        className="w-full px-4 py-4 bg-white border-2 border-gray-100 rounded-2xl text-[0.95rem] font-medium text-secondary placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-sm"
                        placeholder="Juan"
                      />
                    </div>
                    <div className="space-y-2 w-1/2">
                      <label className="text-[0.85rem] font-bold text-secondary ml-1 uppercase tracking-wider">Apellidos</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required={!isLogin}
                        className="w-full px-4 py-4 bg-white border-2 border-gray-100 rounded-2xl text-[0.95rem] font-medium text-secondary placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-sm"
                        placeholder="Pérez"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2 gsap-fade-up">
                  <label className="text-[0.85rem] font-bold text-secondary ml-1 uppercase tracking-wider">Correo electrónico</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors z-10">
                      <Mail size={20} strokeWidth={2} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-100 rounded-2xl text-[0.95rem] font-medium text-secondary placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-sm"
                      placeholder="tu@correo.com"
                    />
                  </div>
                </div>

                <div className="space-y-2 gsap-fade-up">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[0.85rem] font-bold text-secondary uppercase tracking-wider">Contraseña</label>
                    {isLogin && <a href="#" className="text-xs font-bold text-primary hover:text-btn-hover transition-colors">¿Olvidaste tu contraseña?</a>}
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-accent transition-colors z-10">
                      <Lock size={20} strokeWidth={2} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full pl-12 pr-12 py-4 bg-white border-2 border-gray-100 rounded-2xl text-[0.95rem] font-medium text-secondary placeholder-gray-400 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-300 shadow-sm"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-secondary transition-colors z-10"
                    >
                      {showPassword ? <EyeOff size={20} strokeWidth={2} /> : <Eye size={20} strokeWidth={2} />}
                    </button>
                  </div>

                  {!isLogin && password.length > 0 && (
                    <div className="mt-3 text-xs w-full">
                      <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden bg-gray-200 mb-2">
                        <div className={`h-full transition-all duration-500 ease-out ${passwordStrength > 0 ? (passwordStrength === 1 ? 'w-1/3 bg-red-400' : passwordStrength === 2 ? 'w-2/3 bg-yellow-400' : 'w-full bg-success') : 'w-0'}`}></div>
                      </div>
                      <ul className="text-gray-500 space-y-1.5 font-medium ml-1">
                        <li className={`flex items-center gap-1.5 transition-colors ${hasMinLength ? 'text-success' : ''}`}>
                          {hasMinLength ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                          Mínimo 8 caracteres
                        </li>
                        <li className={`flex items-center gap-1.5 transition-colors ${hasUpper ? 'text-success' : ''}`}>
                          {hasUpper ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                          Al menos una letra mayúscula
                        </li>
                        <li className={`flex items-center gap-1.5 transition-colors ${hasNumber ? 'text-success' : ''}`}>
                          {hasNumber ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                          Al menos un número
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                {!isLogin && (
                  <div className="space-y-2 gsap-fade-up">
                    <label className="text-[0.85rem] font-bold text-secondary uppercase tracking-wider ml-1">Confirmar Contraseña</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-accent transition-colors z-10">
                        <Lock size={20} strokeWidth={2} />
                      </div>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required={!isLogin}
                        className={`w-full pl-12 pr-12 py-4 bg-white border-2 rounded-2xl text-[0.95rem] font-medium text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-300 shadow-sm
                          ${confirmPassword.length > 0 && password !== confirmPassword 
                            ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20' 
                            : 'border-gray-100 focus:border-accent focus:ring-accent/20'}`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-secondary transition-colors z-10"
                      >
                        {showConfirmPassword ? <EyeOff size={20} strokeWidth={2} /> : <Eye size={20} strokeWidth={2} />}
                      </button>
                    </div>
                    {confirmPassword.length > 0 && password !== confirmPassword && (
                      <p className="text-red-500 text-xs font-bold ml-1 mt-1">Las contraseñas no coinciden</p>
                    )}
                  </div>
                )}

                {isLogin && (
                  <div className="flex items-center justify-between gsap-fade-up pt-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative flex items-center justify-center w-5 h-5 rounded-[6px] border-2 border-gray-300 group-hover:border-primary transition-colors bg-white">
                        <input type="checkbox" className="peer sr-only" />
                        <div className="absolute inset-0 bg-primary scale-0 peer-checked:scale-100 transition-transform rounded-[4px] flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-gray-500 group-hover:text-secondary transition-colors">Recuérdame</span>
                    </label>
                  </div>
                )}

                <div className="pt-2 gsap-fade-up">
                  <button
                    type="submit"
                    disabled={loading}
                    className="relative w-full bg-secondary text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
                  >
                    <Lock size={18} strokeWidth={2.5} />
                    {loading ? "Procesando..." : isLogin ? "Ingresar a mi perfil" : "Registrarme"}
                  </button>
                </div>
              </form>

              <div className="relative my-8 gsap-fade-up">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-bg-light text-gray-400 font-bold text-xs uppercase tracking-wider">O continuar con</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 gsap-fade-up">
                <button type="button" className="flex items-center justify-center gap-2 w-full py-3.5 bg-white border-2 border-gray-100 rounded-xl hover:bg-gray-50 hover:border-gray-200 transition-all text-[0.9rem] font-bold text-secondary shadow-sm">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>
                <button type="button" className="flex items-center justify-center gap-2 w-full py-3.5 bg-white border-2 border-gray-100 rounded-xl hover:bg-gray-50 hover:border-gray-200 transition-all text-[0.9rem] font-bold text-secondary shadow-sm">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.34-.73 3.83-.66 1.25.04 2.76.62 3.5 1.77-3.04 1.87-2.48 5.75.58 6.94-.78 1.95-1.92 3.23-3.05 4.12h.06zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.02 4.5-3.74 4.25z"></path>
                  </svg>
                  Apple
                </button>
              </div>

              <p className="mt-8 text-center text-[0.95rem] font-medium text-gray-500 gsap-fade-up">
                {isLogin ? "¿No tienes una cuenta? " : "¿Ya tienes una cuenta? "}
                <button 
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                    setMessage(null);
                  }}
                  className="text-primary font-bold hover:text-btn-hover hover:underline decoration-2 underline-offset-4 transition-all"
                >
                  {isLogin ? "Regístrate gratis" : "Inicia sesión aquí"}
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}