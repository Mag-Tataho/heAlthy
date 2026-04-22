import React, { useCallback, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Check } from '../components/OpenMojiIcons';
import BrandLogo from '../components/BrandLogo';

const MAX_SOURCE_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const AVATAR_OUTPUT_SIZE_PX = 320;
const AVATAR_OUTPUT_TYPE = 'image/jpeg';
const AVATAR_OUTPUT_QUALITY = 0.9;

const readFileAsDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected image. Please try again.'));
    reader.readAsDataURL(file);
  });
};

const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image. Please try another one.'));
    image.src = src;
  });
};

const createCroppedAvatarDataUrl = async ({ imageSrc, cropPixels, outputSize = AVATAR_OUTPUT_SIZE_PX }) => {
  if (!cropPixels) {
    throw new Error('Please adjust the crop area before saving.');
  }

  const image = await loadImage(imageSrc);

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Your browser does not support image editing.');
  }

  const cropX = Math.max(0, Math.floor(cropPixels.x));
  const cropY = Math.max(0, Math.floor(cropPixels.y));
  const cropWidth = Math.max(1, Math.min(Math.floor(cropPixels.width), image.width - cropX));
  const cropHeight = Math.max(1, Math.min(Math.floor(cropPixels.height), image.height - cropY));

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, outputSize, outputSize);
  context.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    outputSize,
    outputSize
  );

  return canvas.toDataURL(AVATAR_OUTPUT_TYPE, AVATAR_OUTPUT_QUALITY);
};

const STEPS = ['Account', 'Body Info', 'Goals', 'Preferences'];

const GOALS = [
  { value: 'lose_weight',    label: 'Lose Weight',     desc: 'Reduce body fat' },
  { value: 'maintain',       label: 'Maintain Weight', desc: 'Stay at current weight' },
  { value: 'gain_muscle',    label: 'Gain Muscle',     desc: 'Build lean mass' },
  { value: 'improve_health', label: 'Improve Health',  desc: 'Feel better overall' },
];

const ACTIVITY_LEVELS = [
  { value: 'sedentary',   label: 'Sedentary',         desc: 'Little to no exercise' },
  { value: 'light',       label: 'Lightly Active',    desc: '1-3 days/week' },
  { value: 'moderate',    label: 'Moderately Active', desc: '3-5 days/week' },
  { value: 'active',      label: 'Very Active',       desc: '6-7 days/week' },
  { value: 'very_active', label: 'Extremely Active',  desc: 'Intense daily exercise' },
];

export default function Register() {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState('form');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpDigits, setOtpDigits] = useState(Array(6).fill(''));
  const otpRefs = useRef([]);
  const [avatarCropSrc, setAvatarCropSrc] = useState('');
  const [avatarCropName, setAvatarCropName] = useState('');
  const [avatarCrop, setAvatarCrop] = useState({ x: 0, y: 0 });
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarCropPixels, setAvatarCropPixels] = useState(null);
  const [processingAvatar, setProcessingAvatar] = useState(false);

  const { register, requestSignupOtp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    // Step 0 - Account
    name: '', email: '', password: '', confirm: '', avatarUrl: '', avatarName: '',
    // Step 1 - Body Info
    age: '', gender: '', height: '', weight: '', targetWeight: '',
    // Step 2 - Goals
    goal: 'maintain', activityLevel: 'moderate',
    // Step 3 - Preferences
    allergies: '', dietaryRestrictions: '', cuisinePreferences: '',
  });

  const otpCode = otpDigits.join('');

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setError('');
    setMessage('');
  };

  const resetAvatarCropper = useCallback(() => {
    setAvatarCropSrc('');
    setAvatarCropName('');
    setAvatarCrop({ x: 0, y: 0 });
    setAvatarZoom(1);
    setAvatarCropPixels(null);
  }, []);

  const handleAvatarCropComplete = useCallback((_, croppedAreaPixels) => {
    setAvatarCropPixels(croppedAreaPixels);
  }, []);

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }

    if (file.size > MAX_SOURCE_IMAGE_SIZE_BYTES) {
      setError('Please select an image smaller than 10MB.');
      event.target.value = '';
      return;
    }

    try {
      const avatarDataUrl = await readFileAsDataUrl(file);
      setAvatarCropSrc(avatarDataUrl);
      setAvatarCropName(file.name);
      setAvatarCrop({ x: 0, y: 0 });
      setAvatarZoom(1);
      setAvatarCropPixels(null);
      setError('');
      setMessage('');
    } catch (err) {
      setError(err.message || 'Failed to load image. Please try again.');
    } finally {
      event.target.value = '';
    }
  };

  const handleAvatarCropSave = async () => {
    if (!avatarCropSrc || !avatarCropPixels) {
      setError('Please adjust the crop area before saving.');
      return;
    }

    setProcessingAvatar(true);
    try {
      const avatarDataUrl = await createCroppedAvatarDataUrl({
        imageSrc: avatarCropSrc,
        cropPixels: avatarCropPixels,
      });

      setForm((prev) => ({
        ...prev,
        avatarUrl: avatarDataUrl,
        avatarName: avatarCropName || 'avatar.jpg',
      }));
      resetAvatarCropper();
      setError('');
      setMessage('');
    } catch (err) {
      setError(err.message || 'Failed to crop image. Please try another file.');
    } finally {
      setProcessingAvatar(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const digit = String(value).replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    if (digit && index < otpRefs.current.length - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    event.preventDefault();
    const updated = Array(6).fill('');
    pasted.split('').forEach((digit, index) => {
      updated[index] = digit;
    });
    setOtpDigits(updated);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const validateStep = () => {
    if (step === 0) {
      if (!form.name.trim()) return 'Name is required';
      if (!form.email.trim()) return 'Email is required';
      if (form.password.length < 6) return 'Password must be at least 6 characters';
      if (form.password !== form.confirm) return 'Passwords do not match';
    }
    if (step === 1) {
      if (!form.age || form.age < 1) return 'Please enter your age';
      if (!form.gender) return 'Please select your gender';
      if (!form.height) return 'Please enter your height';
      if (!form.weight) return 'Please enter your weight';
    }
    return null;
  };

  const buildProfilePayload = () => ({
    age: parseInt(form.age, 10) || undefined,
    gender: form.gender || undefined,
    height: parseFloat(form.height) || undefined,
    weight: parseFloat(form.weight) || undefined,
    targetWeight: parseFloat(form.targetWeight) || undefined,
    goal: form.goal,
    activityLevel: form.activityLevel,
    allergies: form.allergies ? form.allergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
    dietaryRestrictions: form.dietaryRestrictions ? form.dietaryRestrictions.split(',').map((s) => s.trim()).filter(Boolean) : [],
    cuisinePreferences: form.cuisinePreferences ? form.cuisinePreferences.split(',').map((s) => s.trim()).filter(Boolean) : [],
  });

  const nextStep = () => {
    const err = validateStep();
    if (err) return setError(err);
    setStep((s) => s + 1);
  };

  const handleSendVerificationCode = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await requestSignupOtp(form.name, form.email, form.password);
      setMode('verify');
      setOtpDigits(Array(6).fill(''));
      setMessage('A 6-digit verification code has been sent to your email.');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndCreate = async () => {
    if (!/^\d{6}$/.test(otpCode)) {
      setError('Enter a valid 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        avatarUrl: form.avatarUrl || undefined,
        profile: buildProfilePayload(),
        code: otpCode,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    setError('');
    setMessage('');

    try {
      await requestSignupOtp(form.name, form.email, form.password);
      setOtpDigits(Array(6).fill(''));
      setMessage('A new verification code was sent to your email.');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to resend verification code.');
    } finally {
      setResending(false);
    }
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center gap-1.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              i < step ? 'bg-sage-600 text-white' :
              i === step ? 'bg-sage-600 text-white ring-4 ring-sage-200 dark:ring-sage-900' :
              'bg-sage-100 dark:bg-gray-800 text-sage-400 dark:text-gray-500'
            }`}>
              {i < step ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-sage-700 dark:text-sage-300' : 'text-sage-400 dark:text-gray-500'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 max-w-8 rounded transition-all duration-300 ${i < step ? 'bg-sage-500' : 'bg-sage-100 dark:bg-gray-800'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-cream dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fadeIn">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <BrandLogo size="md" className="h-[7.03125rem] w-[7.03125rem]" />
          <span className="font-display text-2xl font-semibold text-sage-900 dark:text-white">heAlthy</span>
        </div>

        <div className="card dark:bg-gray-900 dark:border-gray-800">
          {mode === 'form' ? (
            <>
              <StepIndicator />

              {/* STEP 0 - Account */}
              {step === 0 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-sage-900 dark:text-white">Create your account</h2>
                    <p className="text-sage-500 dark:text-gray-400 text-sm mt-1">Start your health journey today - free forever</p>
                  </div>
                  <div>
                    <label className="label">Full name</label>
                    <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} className="input-field" placeholder="Your full name" />
                  </div>
                  <div>
                    <label className="label">Profile photo <span className="text-sage-400 font-normal">(optional)</span></label>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-full border border-sage-200 dark:border-gray-700 bg-sage-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                        {form.avatarUrl ? (
                          <img src={form.avatarUrl} alt="Profile preview" className="w-full h-full object-cover" />
                        ) : (
                          <BrandLogo size="sm" className="h-10 w-10" />
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={handleAvatarChange}
                          className="block w-full text-sm text-sage-600 dark:text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-sage-100 dark:file:bg-gray-700 file:text-sage-700 dark:file:text-gray-200 hover:file:bg-sage-200 dark:hover:file:bg-gray-600"
                        />
                        <p className="text-xs text-sage-400 dark:text-gray-500 mt-1 truncate">
                          {form.avatarName || 'Choose a photo, then crop and save. It will auto-resize for your avatar.'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="label">Email address</label>
                    <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="input-field" placeholder="you@example.com" />
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} className="input-field" placeholder="At least 6 characters" />
                  </div>
                  <div>
                    <label className="label">Confirm password</label>
                    <input type="password" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} className="input-field" placeholder="Repeat password" />
                  </div>
                </div>
              )}

              {/* STEP 1 - Body Info */}
              {step === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-sage-900 dark:text-white">Your body info</h2>
                    <p className="text-sage-500 dark:text-gray-400 text-sm mt-1">Used to calculate your personalized calorie targets</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Age</label>
                      <input type="number" value={form.age} onChange={(e) => set('age', e.target.value)} className="input-field" placeholder="e.g. 22" min="1" max="120" />
                    </div>
                    <div>
                      <label className="label">Gender</label>
                      <select value={form.gender} onChange={(e) => set('gender', e.target.value)} className="input-field">
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Height (cm)</label>
                      <input type="number" value={form.height} onChange={(e) => set('height', e.target.value)} className="input-field" placeholder="e.g. 165" />
                    </div>
                    <div>
                      <label className="label">Weight (kg)</label>
                      <input type="number" value={form.weight} onChange={(e) => set('weight', e.target.value)} className="input-field" placeholder="e.g. 65" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Target weight (kg) <span className="text-sage-400 font-normal">- optional</span></label>
                    <input type="number" value={form.targetWeight} onChange={(e) => set('targetWeight', e.target.value)} className="input-field" placeholder="e.g. 60" />
                  </div>
                </div>
              )}

              {/* STEP 2 - Goals */}
              {step === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-sage-900 dark:text-white">Your goals</h2>
                    <p className="text-sage-500 dark:text-gray-400 text-sm mt-1">What are you aiming for?</p>
                  </div>
                  <div>
                    <label className="label">Primary goal</label>
                    <div className="grid grid-cols-2 gap-2">
                      {GOALS.map((g) => (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => set('goal', g.value)}
                          className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                            form.goal === g.value
                              ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/40 dark:border-sage-500'
                              : 'border-sage-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-sage-300'
                          }`}
                        >
                          <p className="text-sm font-medium text-sage-900 dark:text-white">{g.label}</p>
                          <p className="text-xs text-sage-400 dark:text-gray-500 mt-0.5">{g.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Activity level</label>
                    <div className="space-y-2">
                      {ACTIVITY_LEVELS.map((a) => (
                        <button
                          key={a.value}
                          type="button"
                          onClick={() => set('activityLevel', a.value)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm transition-all duration-200 ${
                            form.activityLevel === a.value
                              ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/40 dark:border-sage-500'
                              : 'border-sage-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-sage-300'
                          }`}
                        >
                          <span className="font-medium text-sage-900 dark:text-white">{a.label}</span>
                          <span className="text-sage-400 dark:text-gray-500 text-xs">{a.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3 - Preferences */}
              {step === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-sage-900 dark:text-white">Food preferences</h2>
                    <p className="text-sage-500 dark:text-gray-400 text-sm mt-1">Help us personalize your meal plans (all optional)</p>
                  </div>
                  <div>
                    <label className="label">Allergies <span className="text-sage-400 font-normal">(comma-separated)</span></label>
                    <input
                      type="text"
                      value={form.allergies}
                      onChange={(e) => set('allergies', e.target.value)}
                      className="input-field"
                      placeholder="e.g. nuts, shellfish, dairy"
                    />
                  </div>
                  <div>
                    <label className="label">Dietary restrictions <span className="text-sage-400 font-normal">(comma-separated)</span></label>
                    <input
                      type="text"
                      value={form.dietaryRestrictions}
                      onChange={(e) => set('dietaryRestrictions', e.target.value)}
                      className="input-field"
                      placeholder="e.g. vegetarian, gluten-free, halal"
                    />
                  </div>
                  <div>
                    <label className="label">Cuisine preferences <span className="text-sage-400 font-normal">(comma-separated)</span></label>
                    <input
                      type="text"
                      value={form.cuisinePreferences}
                      onChange={(e) => set('cuisinePreferences', e.target.value)}
                      className="input-field"
                      placeholder="e.g. Filipino, Asian, Mediterranean"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                {step > 0 && (
                  <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-secondary flex-1" disabled={loading}>
                    Back
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button type="button" onClick={nextStep} className="btn-primary flex-1" disabled={loading}>
                    Next
                  </button>
                ) : (
                  <button type="button" onClick={handleSendVerificationCode} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {loading ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending code...</>
                    ) : 'Send Verification Code'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-5 animate-fadeIn">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-sage-100 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300 flex items-center justify-center text-3xl mx-auto mb-4">
                  OTP
                </div>
                <h2 className="font-display text-2xl font-semibold text-sage-900 dark:text-white">Verify Your Email</h2>
                <p className="text-sage-500 dark:text-gray-400 text-sm mt-1">
                  Enter the 6-digit code sent to {form.email}
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}
              {message && (
                <div className="p-3 bg-sage-50 dark:bg-sage-900/20 border border-sage-200 dark:border-sage-800 rounded-xl text-sage-700 dark:text-sage-300 text-sm">
                  {message}
                </div>
              )}

              <div>
                <label className="label">6-digit verification code</label>
                <div className="grid grid-cols-6 gap-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={`signup-otp-${index}`}
                      ref={(el) => { otpRefs.current[index] = el; }}
                      type="text"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="h-12 text-center text-lg font-semibold rounded-xl border border-sage-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sage-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sage-400"
                      inputMode="numeric"
                      maxLength={1}
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-sage-500 dark:text-gray-400">
                <button
                  type="button"
                  onClick={() => {
                    setMode('form');
                    setOtpDigits(Array(6).fill(''));
                    setError('');
                    setMessage('');
                  }}
                  className="font-medium hover:underline"
                  disabled={loading}
                >
                  Back to form
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resending || loading}
                  className="font-medium text-sage-700 dark:text-sage-300 hover:underline disabled:opacity-60"
                >
                  {resending ? 'Resending...' : 'Resend code'}
                </button>
              </div>

              <button type="button" onClick={handleVerifyAndCreate} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating account...</>
                ) : 'Verify & Create Account'}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-sage-600 dark:text-gray-400 text-sm mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-sage-700 dark:text-sage-400 font-medium hover:underline">Sign in</Link>
        </p>

        {avatarCropSrc && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl overflow-hidden border border-white/10 bg-black shadow-2xl">
              <div className="relative h-[22rem] bg-black">
                <Cropper
                  image={avatarCropSrc}
                  crop={avatarCrop}
                  zoom={avatarZoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  minZoom={1}
                  maxZoom={4}
                  objectFit="cover"
                  onCropChange={setAvatarCrop}
                  onZoomChange={setAvatarZoom}
                  onCropComplete={handleAvatarCropComplete}
                />
              </div>

              <div className="px-4 py-4 space-y-3 bg-black">
                <div className="flex items-center gap-3">
                  <label htmlFor="register-avatar-zoom" className="text-xs uppercase tracking-wide text-white/70">Zoom</label>
                  <input
                    id="register-avatar-zoom"
                    type="range"
                    min={1}
                    max={4}
                    step={0.01}
                    value={avatarZoom}
                    onChange={(event) => setAvatarZoom(Number(event.target.value))}
                    className="w-full accent-rose-500"
                  />
                </div>

                <p className="text-xs text-white/60 truncate">
                  {avatarCropName || 'Adjust your photo to fit the circular frame'}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={resetAvatarCropper}
                    disabled={processingAvatar}
                    className="h-11 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAvatarCropSave}
                    disabled={processingAvatar}
                    className="h-11 rounded-xl bg-rose-500 text-white font-semibold hover:bg-rose-400 transition-colors disabled:opacity-60"
                  >
                    {processingAvatar ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
