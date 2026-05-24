import { useSyncExternalStore } from 'react';

export type ResolvedAppearance = 'light' | 'dark';
export type Appearance = ResolvedAppearance | 'system';

// NUEVO: colores de tema disponibles
export type Theme = 'default' | 'blue' | 'green' | 'red';

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly updateAppearance: (mode: Appearance) => void;

    // NUEVO: estado del tema
    readonly theme: Theme;

    // NUEVO: cambiar tema
    readonly updateTheme: (theme: Theme) => void;
};

const listeners = new Set<() => void>();

// YA EXISTÍA: modo light/dark/system
let currentAppearance: Appearance = 'system';

// NUEVO: tema de color actual
let currentTheme: Theme = 'default';

const prefersDark = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const setCookie = (
    name: string,
    value: string,
    days = 365,
): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;

    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const getStoredAppearance = (): Appearance => {
    if (typeof window === 'undefined') {
        return 'system';
    }

    return (
        (localStorage.getItem('appearance') as Appearance) ||
        'system'
    );
};

// NUEVO: cargar tema desde localStorage
const getStoredTheme = (): Theme => {
    if (typeof window === 'undefined') {
        return 'default';
    }

    return (
        (localStorage.getItem('theme') as Theme) ||
        'default'
    );
};

const isDarkMode = (
    appearance: Appearance,
): boolean => {
    return (
        appearance === 'dark' ||
        (appearance === 'system' && prefersDark())
    );
};

// YA EXISTÍA: aplica dark/light
const applyTheme = (
    appearance: Appearance,
): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const isDark = isDarkMode(appearance);

    // agrega o quita .dark
    document.documentElement.classList.toggle(
        'dark',
        isDark,
    );

    // ayuda al navegador con color scheme
    document.documentElement.style.colorScheme =
        isDark ? 'dark' : 'light';
};

// NUEVO: aplica theme-blue/theme-red/etc
const applyColorTheme = (
    theme: Theme,
): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const root = document.documentElement;

    // limpia temas anteriores
    root.classList.remove(
        'theme-blue',
        'theme-green',
        'theme-red',
    );

    // default = sin clase
    if (theme !== 'default') {
        root.classList.add(`theme-${theme}`);
    }
};

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const notify = (): void =>
    listeners.forEach((listener) =>
        listener(),
    );

const mediaQuery = (): MediaQueryList | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.matchMedia(
        '(prefers-color-scheme: dark)',
    );
};

// YA EXISTÍA: si system cambia el SO
const handleSystemThemeChange =
    (): void => {
        applyTheme(currentAppearance);
    };

export function initializeTheme(): void {
    if (typeof window === 'undefined') {
        return;
    }

    // si no existe appearance lo crea
    if (!localStorage.getItem('appearance')) {
        localStorage.setItem(
            'appearance',
            'system',
        );

        setCookie(
            'appearance',
            'system',
        );
    }

    // NUEVO: si no existe theme lo crea
    if (!localStorage.getItem('theme')) {
        localStorage.setItem(
            'theme',
            'default',
        );
    }

    // cargar appearance guardado
    currentAppearance =
        getStoredAppearance();

    // NUEVO: cargar theme guardado
    currentTheme = getStoredTheme();

    // aplicar dark/light
    applyTheme(currentAppearance);

    // NUEVO: aplicar color
    applyColorTheme(currentTheme);

    // escuchar cambios del SO
    mediaQuery()?.addEventListener(
        'change',
        handleSystemThemeChange,
    );
}

export function useAppearance(): UseAppearanceReturn {
    const appearance: Appearance =
        useSyncExternalStore(
            subscribe,
            () => currentAppearance,
            () => 'system',
        );

    const resolvedAppearance: ResolvedAppearance =
        isDarkMode(appearance)
            ? 'dark'
            : 'light';

    // YA EXISTÍA: cambiar light/dark/system
    const updateAppearance = (
        mode: Appearance,
    ): void => {
        currentAppearance = mode;

        // guardar en localStorage
        localStorage.setItem(
            'appearance',
            mode,
        );

        // guardar cookie SSR
        setCookie(
            'appearance',
            mode,
        );

        // aplicar tema
        applyTheme(mode);

        // actualizar listeners
        notify();
    };

    // NUEVO: cambiar color theme
    const updateTheme = (
        theme: Theme,
    ): void => {
        currentTheme = theme;

        // guardar theme
        localStorage.setItem(
            'theme',
            theme,
        );

        // aplicar clase theme-*
        applyColorTheme(theme);

        // actualizar UI
        notify();
    };

    return {
        appearance,
        resolvedAppearance,
        updateAppearance,

        // NUEVO
        theme: currentTheme,
        updateTheme,
    } as const;
}