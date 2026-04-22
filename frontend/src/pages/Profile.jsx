import React, { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import BrandLogo from '../components/BrandLogo';
import Settings from './Settings';

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

// ── Defined OUTSIDE component so React never remounts them ──
const GOALS = [
  { value: 'lose_weight',    label: 'Lose Weight' },
  { value: 'maintain',       label: 'Maintain Weight' },
  { value: 'gain_muscle',    label: 'Gain Muscle' },
  { value: 'improve_health', label: 'Improve Health' },
];
const ACTIVITY_LEVELS = [
  { value: 'sedentary',   label: 'Sedentary',         desc: 'Little/no exercise' },
  { value: 'light',       label: 'Lightly Active',    desc: '1–3 days/week' },
  { value: 'moderate',    label: 'Moderately Active', desc: '3–5 days/week' },
  { value: 'active',      label: 'Very Active',       desc: '6–7 days/week' },
  { value: 'very_active', label: 'Extremely Active',  desc: 'Intense daily' },
];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const p = user?.profile || {};

  const [profile, setProfile] = useState({
    name:                user?.name || '',
    age:                 p.age || '',
    gender:              p.gender || '',
    height:              p.height || '',
    weight:              p.weight || '',
    targetWeight:        p.targetWeight || '',
    activityLevel:       p.activityLevel || 'moderate',
    goal:                p.goal || 'maintain',
    allergies:           p.allergies?.join(', ') || '',
    dietaryRestrictions: p.dietaryRestrictions?.join(', ') || '',
    cuisinePreferences:  p.cuisinePreferences?.join(', ') || '',
    avatarUrl:           user?.avatarUrl || '',
    avatarName:          '',
  });

  const [privacy, setPrivacy] = useState(user?.privacy || {
    showProgress: true,
    showProfile:  true,
    showGoal:     true,
  });
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState('');
  const [avatarCropSrc, setAvatarCropSrc] = useState('');
  const [avatarCropName, setAvatarCropName] = useState('');
  const [avatarCrop, setAvatarCrop] = useState({ x: 0, y: 0 });
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarCropPixels, setAvatarCropPixels] = useState(null);
  const [processingAvatar, setProcessingAvatar] = useState(false);

  const set = (k, v) => { setProfile(prev => ({ ...prev, [k]: v })); setSuccess(false); };

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
      setSuccess(false);
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

      const { data } = await api.put('/profile', {
        avatarUrl: avatarDataUrl,
      });

      setProfile((prev) => ({
        ...prev,
        avatarUrl: data.user?.avatarUrl || avatarDataUrl,
        avatarName: avatarCropName || 'avatar.jpg',
      }));
      if (data.user) {
        updateUser(data.user);
      }
      resetAvatarCropper();
      setError('');
      setSuccess(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to crop image. Please try another file.');
    } finally {
      setProcessingAvatar(false);
    }
  };

  const handlePrivacyChange = async (key) => {
    const updated = { ...privacy, [key]: !privacy[key] };
    setPrivacy(updated);
    setSavingPrivacy(true);
    try {
      const { data } = await api.put('/profile/privacy', { privacy: updated });
      updateUser(data.user);
    } catch { setPrivacy(privacy); }
    finally { setSavingPrivacy(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        age:                 profile.age          ? parseInt(profile.age)            : undefined,
        gender:              profile.gender        || undefined,
        height:              profile.height        ? parseFloat(profile.height)       : undefined,
        weight:              profile.weight        ? parseFloat(profile.weight)       : undefined,
        targetWeight:        profile.targetWeight  ? parseFloat(profile.targetWeight) : undefined,
        activityLevel:       profile.activityLevel,
        goal:                profile.goal,
        allergies:           profile.allergies           ? profile.allergies.split(',').map(s => s.trim()).filter(Boolean)           : [],
        dietaryRestrictions: profile.dietaryRestrictions ? profile.dietaryRestrictions.split(',').map(s => s.trim()).filter(Boolean) : [],
        cuisinePreferences:  profile.cuisinePreferences  ? profile.cuisinePreferences.split(',').map(s => s.trim()).filter(Boolean)  : [],
      };
      const { data } = await api.put('/profile', {
        name: profile.name?.trim() || user?.name,
        avatarUrl: profile.avatarUrl || '',
        profile: payload,
      });
      updateUser(data.user);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally { setSaving(false); }
  };


  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="animate-fadeIn">
        <h1 className="section-title">Profile & Settings</h1>
        <p className="text-sage-600 dark:text-gray-400 mt-1">Manage your account, preferences, privacy, and appearance in one place</p>
      </div>

      {success && <div className="p-3 bg-sage-50 dark:bg-sage-900/30 border border-sage-300 dark:border-sage-700 rounded-xl text-sage-700 dark:text-sage-300 text-sm text-center animate-fadeIn">Profile saved!</div>}
      {error   && <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Account and photo */}
        <div className="card dark:bg-gray-900 dark:border-gray-800 animate-fadeIn">
          <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white mb-4">Account & Photo</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-24 h-24 rounded-full border border-sage-200 dark:border-gray-700 bg-sage-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <BrandLogo size="sm" className="h-12 w-12" />
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <label className="label">Display name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => set('name', e.target.value)}
                  className="input-field"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="label">Profile photo</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleAvatarChange}
                  className="block w-full text-sm text-sage-600 dark:text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-sage-100 dark:file:bg-gray-700 file:text-sage-700 dark:file:text-gray-200 hover:file:bg-sage-200 dark:hover:file:bg-gray-600"
                />
                <p className="text-xs text-sage-400 dark:text-gray-500 mt-1 truncate">
                  {profile.avatarName || 'Choose a photo, then crop and save. It will auto-resize for your top-right avatar.'}
                </p>
              </div>

              {profile.avatarUrl && (
                <button
                  type="button"
                  onClick={() => setProfile((prev) => ({ ...prev, avatarUrl: '', avatarName: '' }))}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  Remove profile photo
                </button>
              )}

              <p className="text-xs text-sage-500 dark:text-gray-400">
                Email: <span className="font-medium text-sage-700 dark:text-gray-300">{user?.email}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Body Info */}
        <div className="card dark:bg-gray-900 dark:border-gray-800 animate-fadeIn">
          <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white mb-4">Body Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Age</label>
              <input type="number" value={profile.age} onChange={e => set('age', e.target.value)}
                className="input-field" placeholder="e.g. 22" min="1" max="120" />
            </div>
            <div>
              <label className="label">Gender</label>
              <select value={profile.gender} onChange={e => set('gender', e.target.value)} className="input-field">
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Height (cm)</label>
              <input type="number" value={profile.height} onChange={e => set('height', e.target.value)}
                className="input-field" placeholder="e.g. 165" min="0" />
            </div>
            <div>
              <label className="label">Current Weight (kg)</label>
              <input type="number" value={profile.weight} onChange={e => set('weight', e.target.value)}
                className="input-field" placeholder="e.g. 65" min="0" step="0.1" />
            </div>
            <div className="col-span-2">
              <label className="label">Target Weight (kg) <span className="font-normal text-sage-400">optional</span></label>
              <input type="number" value={profile.targetWeight} onChange={e => set('targetWeight', e.target.value)}
                className="input-field" placeholder="e.g. 60" min="0" step="0.1" />
            </div>
          </div>
        </div>

        {/* Goals */}
        <div className="card dark:bg-gray-900 dark:border-gray-800 animate-fadeIn">
          <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white mb-4">Goals</h2>
          <div className="mb-4">
            <label className="label">Primary Goal</label>
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map(g => (
                <button key={g.value} type="button" onClick={() => set('goal', g.value)}
                  className={`p-3 rounded-xl border text-sm font-medium text-left transition-all ${profile.goal === g.value ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/40 dark:border-sage-500' : 'border-sage-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-sage-300'}`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Activity Level</label>
            <div className="space-y-2">
              {ACTIVITY_LEVELS.map(a => (
                <button key={a.value} type="button" onClick={() => set('activityLevel', a.value)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${profile.activityLevel === a.value ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/40 dark:border-sage-500' : 'border-sage-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-sage-300'}`}>
                  <span className="font-medium text-sage-900 dark:text-white">{a.label}</span>
                  <span className="text-sage-400 dark:text-gray-500 text-xs">{a.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>



        {/* Preferences */}
        <div className="card dark:bg-gray-900 dark:border-gray-800 animate-fadeIn">
          <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white mb-4">Food Preferences</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Allergies <span className="font-normal text-sage-400">(comma-separated)</span></label>
              <input type="text" value={profile.allergies} onChange={e => set('allergies', e.target.value)}
                className="input-field" placeholder="e.g. nuts, shellfish, dairy" />
            </div>
            <div>
              <label className="label">Dietary Restrictions <span className="font-normal text-sage-400">(comma-separated)</span></label>
              <input type="text" value={profile.dietaryRestrictions} onChange={e => set('dietaryRestrictions', e.target.value)}
                className="input-field" placeholder="e.g. vegetarian, gluten-free, halal" />
            </div>
            <div>
              <label className="label">Cuisine Preferences <span className="font-normal text-sage-400">(comma-separated)</span></label>
              <input type="text" value={profile.cuisinePreferences} onChange={e => set('cuisinePreferences', e.target.value)}
                className="input-field" placeholder="e.g. Filipino, Asian, Mediterranean" />
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="card dark:bg-gray-900 dark:border-gray-800 animate-fadeIn">
          <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white mb-1">Privacy Settings</h2>
          <p className="text-xs text-sage-400 dark:text-gray-500 mb-4">Control what your friends can see on your profile</p>
          {[
            { key: 'showProgress', label: 'Show Progress to Friends', desc: 'Friends can see your weight, calories and workout logs' },
            { key: 'showProfile',  label: 'Show Profile Details',     desc: 'Friends can see your body info and goals' },
            { key: 'showGoal',     label: 'Show Health Goal',         desc: 'Friends can see your health goal (e.g. Lose Weight)' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-sage-50 dark:border-gray-800 last:border-0">
              <div>
                <p className="text-sm font-medium text-sage-800 dark:text-gray-200">{label}</p>
                <p className="text-xs text-sage-500 dark:text-gray-400 mt-0.5">{desc}</p>
              </div>
              <button type="button" onClick={() => handlePrivacyChange(key)}
                className={`w-11 h-6 rounded-full transition-all duration-200 flex items-center flex-shrink-0 ${privacy[key] ? 'bg-sage-600 justify-end' : 'bg-sage-200 dark:bg-gray-700 justify-start'}`}>
                <span className="w-5 h-5 rounded-full bg-white shadow-sm mx-0.5 block" />
              </button>
            </div>
          ))}
          {savingPrivacy && <p className="text-xs text-sage-400 mt-2 text-center">Saving privacy settings...</p>}
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base">
          {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</> : 'Save Profile'}
        </button>
      </form>

      <div className="pt-2 border-t border-sage-100 dark:border-gray-800">
        <Settings embedded />
      </div>

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
                <label htmlFor="avatar-zoom" className="text-xs uppercase tracking-wide text-white/70">Zoom</label>
                <input
                  id="avatar-zoom"
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
  );
}
