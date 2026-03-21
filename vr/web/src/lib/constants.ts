type Option = { value: string; label: string; group?: string };
type BandOption = { value: number; label: string };

// Role options
export const ROLE_OPTIONS: Option[] = [
    { value: "software_engineer", label: "Software Engineer" },
    { value: "gameplay_engineer", label: "Gameplay Engineer" },
    { value: "graphics_engineer", label: "Graphics/Rendering Engineer" },
    { value: "computer_vision_engineer", label: "Computer Vision/MR Engineer" },
    { value: "technical_artist", label: "Technical Artist" },
    { value: "3d_artist", label: "3D Artist/Modeler" },
    { value: "animator_rigger", label: "Animator/Rigger" },
    { value: "vfx_artist", label: "VFX Artist" },
    { value: "interaction_designer", label: "Interaction/UI/UX Designer" },
    { value: "audio_engineer", label: "Audio Engineer" },
    { value: "qa_tester", label: "QA/Testing" },
    { value: "producer", label: "Producer" },
    { value: "product_manager", label: "Product Manager" },
    { value: "research_prototyper", label: "Research/Prototyper" },
];

// Engine options
export const ENGINE_OPTIONS: Option[] = [
    { value: "unity", label: "Unity" },
    { value: "unreal", label: "Unreal Engine" },
    { value: "realitykit", label: "RealityKit" },
    { value: "webxr", label: "WebXR" },
];

export const ENGINE_VARIANTS_BY_ENGINE: Record<string, Option[]> = {
    unity: [
        { value: "built_in", label: "Built-in RP" },
        { value: "urp", label: "URP" },
        { value: "hdrp", label: "HDRP" },
    ],
    unreal: [
        { value: "blueprints", label: "Blueprints" },
        { value: "cpp", label: "C++" },
    ],
    realitykit: [
        { value: "realitykit", label: "RealityKit" },
        { value: "reality_composer_pro", label: "Reality Composer Pro" },
    ],
    webxr: [
        { value: "threejs", label: "Three.js" },
        { value: "babylonjs", label: "Babylon.js" },
        { value: "playcanvas", label: "PlayCanvas" },
        { value: "aframe", label: "A-Frame" },
    ],
};

// SDK options
export const SDK_OPTIONS: Option[] = [
    { value: "arkit", label: "ARKit" },
    { value: "arcore", label: "ARCore" },
    { value: "openxr", label: "OpenXR" },
    { value: "xrit", label: "XR Interaction Toolkit" },
    { value: "mrtk", label: "MRTK" },
    { value: "vrtk", label: "VRTK" },
    { value: "oculus_integration", label: "Oculus Integration (Meta)" },
    { value: "steamvr_plugin", label: "SteamVR Plugin" },
    { value: "niantic_lightship", label: "Niantic Lightship" },
];

// Device options
export const DEVICE_OPTIONS: Option[] = [
    // Meta Quest
    { group: "Meta Quest", value: "meta_quest:quest", label: "Meta Quest (Gen 1)" },
    { group: "Meta Quest", value: "meta_quest:quest_2", label: "Meta Quest 2" },
    { group: "Meta Quest", value: "meta_quest:quest_3", label: "Meta Quest 3" },
    { group: "Meta Quest", value: "meta_quest:quest_pro", label: "Meta Quest Pro" },
    // Apple Vision Pro
    { group: "Apple Vision Pro", value: "vision_pro:vision_pro", label: "Apple Vision Pro" },
    // HoloLens
    { group: "HoloLens", value: "hololens:hololens_2", label: "HoloLens 2" },
    // Magic Leap
    { group: "Magic Leap", value: "magic_leap:ml2", label: "Magic Leap 2" },
    // Vive / Index
    { group: "Vive / Index", value: "vive:vive", label: "HTC Vive" },
    { group: "Vive / Index", value: "vive:vive_pro", label: "HTC Vive Pro" },
    { group: "Vive / Index", value: "vive:vive_xr_elite", label: "Vive XR Elite" },
    { group: "Vive / Index", value: "index:valve_index", label: "Valve Index" },
    // Pico
    { group: "Pico", value: "pico:pico_neo_3", label: "Pico Neo 3" },
    { group: "Pico", value: "pico:pico_4", label: "Pico 4" },
    // Varjo
    { group: "Varjo", value: "varjo:varjo_xr3", label: "Varjo XR-3" },
    { group: "Varjo", value: "varjo:varjo_aero", label: "Varjo Aero" },
    // Windows MR
    { group: "Windows MR", value: "windows_mr:hp_reverb_g2", label: "HP Reverb G2" },
    // Mobile AR
    { group: "Mobile AR", value: "mobile_ar:ios_arkit", label: "iOS (ARKit)" },
    { group: "Mobile AR", value: "mobile_ar:android_arcore", label: "Android (ARCore)" },
    // WebXR
    { group: "WebXR", value: "webxr:quest_browser", label: "Quest Browser" },
    { group: "WebXR", value: "webxr:safari_visionos", label: "Safari (visionOS)" },
    { group: "WebXR", value: "webxr:chrome", label: "Chrome" },
    { group: "WebXR", value: "webxr:edge", label: "Edge" },
];

// Modality options
export const MODALITY_OPTIONS: Option[] = [
    { value: "sixdof_controllers", label: "6DoF Controllers" },
    { value: "hand_tracking", label: "Hand Tracking" },
    { value: "eye_tracking", label: "Eye Tracking" },
    { value: "face_tracking", label: "Face Tracking" },
    { value: "full_body_ik", label: "Full-body IK" },
    { value: "body_tracking", label: "Body Tracking" },
    { value: "spatial_mapping", label: "Spatial Mapping/Meshing" },
    { value: "planes_anchors", label: "Planes/Anchors" },
    { value: "image_tracking", label: "Image Tracking" },
    { value: "object_tracking", label: "Object Tracking" },
    { value: "passthrough", label: "Passthrough/MR" },
    { value: "occlusion", label: "Occlusion" },
    { value: "haptics", label: "Haptics" },
];

// Work related options
export const WORK_MODE_OPTIONS: Option[] = [
    { value: "remote", label: "Remote" },
    { value: "hybrid", label: "Hybrid" },
    { value: "onsite", label: "Onsite" },
];

export const WORK_TYPE_OPTIONS: Option[] = [
    { value: "full_time", label: "Full-time" },
    { value: "contract", label: "Contract" },
    { value: "freelance", label: "Freelance" },
    { value: "intern", label: "Internship" },
];

// Scale bands
export const INSTALL_BANDS: BandOption[] = [
    { value: 0, label: "<10k" },
    { value: 1, label: "10k–100k" },
    { value: 2, label: "100k–1M" },
    { value: 3, label: "1M–10M" },
    { value: 4, label: "10M+" },
];

export const LANG_BANDS: BandOption[] = [
    { value: 0, label: "1" },
    { value: 1, label: "2–5" },
    { value: 2, label: "6–10" },
    { value: 3, label: "10+" },
];

export const REGION_BANDS: BandOption[] = [
    { value: 0, label: "1" },
    { value: 1, label: "2–3" },
    { value: 2, label: "4–6" },
    { value: 3, label: "7+" },
];

export const REGION_BANDS_VALUES = [0, 1, 2, 3]; // <-- adjust to match your DB constraint!

export const PEAK_CCU_BANDS: BandOption[] = [
    { value: 0, label: "<100" },
    { value: 1, label: "100–1k" },
    { value: 2, label: "1k–10k" },
    { value: 3, label: "10k–100k" },
    { value: 4, label: "100k+" },
];

export const TYPICAL_CCU_BANDS: BandOption[] = [
    { value: 0, label: "<50" },
    { value: 1, label: "50–500" },
    { value: 2, label: "500–5k" },
    { value: 3, label: "5k+" },
];

export const DEVICES_DEPLOYED_BANDS: BandOption[] = [
    { value: 0, label: "<50" },
    { value: 1, label: "50–200" },
    { value: 2, label: "200–1k" },
    { value: 3, label: "1k–10k" },
    { value: 4, label: "10k+" },
];

export const SITES_BANDS: BandOption[] = [
    { value: 0, label: "1" },
    { value: 1, label: "2–5" },
    { value: 2, label: "6–20" },
    { value: 3, label: "21+" },
];

export const TRAINEES_BANDS: BandOption[] = [
    { value: 0, label: "<100" },
    { value: 1, label: "100–1k" },
    { value: 2, label: "1k–10k" },
    { value: 3, label: "10k+" },
];

export const CRASH_FREE_BANDS: BandOption[] = [
    { value: 0, label: "≥98%" },
    { value: 1, label: "≥99%" },
    { value: 2, label: "≥99.5%" },
    { value: 3, label: "≥99.9%" },
];

export const UPTIME_BANDS: BandOption[] = [
    { value: 0, label: "≥99%" },
    { value: 1, label: "≥99.9%" },
    { value: 2, label: "≥99.99%" },
    { value: 3, label: "≥99.999%" },
];

// Release and deployment options
export const RELEASE_CADENCE_OPTIONS: Option[] = [
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Bi-weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "adhoc", label: "Ad-hoc" },
];

export const ROLE_AT_SCALE_OPTIONS: Option[] = [
    { value: "ic", label: "Individual Contributor" },
    { value: "tech_lead", label: "Tech Lead" },
    { value: "manager", label: "Manager" },
    { value: "producer", label: "Producer" },
    { value: "researcher", label: "Researcher" },
];

// Industry verticals
export const VERTICAL_OPTIONS: Option[] = [
    { value: "games", label: "Games/Entertainment" },
    { value: "training", label: "Training/Simulation" },
    { value: "aec", label: "Architecture/Engineering/Construction (AEC)" },
    { value: "industrial", label: "Industrial/Manufacturing" },
    { value: "healthcare", label: "Healthcare/MedTech" },
    { value: "education", label: "Education" },
    { value: "retail", label: "Retail/Marketing/Brand" },
    { value: "dataviz", label: "Data Visualization" },
    { value: "research", label: "Research/Academic" },
    { value: "defense", label: "Government/Defense" },
];

// Toolchain options
export const TOOLCHAIN_OPTIONS: Option[] = [
    { value: "blender", label: "Blender" },
    { value: "maya", label: "Maya" },
    { value: "houdini", label: "Houdini" },
    { value: "substance_painter", label: "Substance Painter" },
    { value: "substance_designer", label: "Substance Designer" },
    { value: "realitycapture", label: "RealityCapture" },
    { value: "metashape", label: "Agisoft Metashape" },
    { value: "mocap_xsens", label: "Xsens (Mocap)" },
    { value: "mocap_rokoko", label: "Rokoko (Mocap)" },
    { value: "wwise", label: "Wwise" },
    { value: "fmod", label: "FMOD" },
    { value: "git", label: "Git" },
    { value: "perforce", label: "Perforce" },
    { value: "github_actions", label: "GitHub Actions" },
    { value: "gitlab_ci", label: "GitLab CI" },
];

// Export types for use in other files
export type { Option, BandOption };

// New user segments
export const MAU_BANDS: BandOption[] = [
    { value: 0, label: "<1k" },
    { value: 1, label: "1k-10k" },
    { value: 2, label: "10k-100k" },
    { value: 3, label: "100k-1M" },
    { value: 4, label: "1M+" },
];

export const TEAM_SIZE_BANDS: BandOption[] = [
    { value: 0, label: "Solo" },
    { value: 1, label: "2-5" },
    { value: 2, label: "6-15" },
    { value: 3, label: "16-50" },
    { value: 4, label: "51+" },
];