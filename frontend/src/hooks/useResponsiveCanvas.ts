import { useState, useEffect, useCallback } from 'react';
import { CANVAS_CONFIG } from '../utils/constants';

/**
 * Canvas 尺寸信息
 */
interface CanvasSize {
    width: number;
    height: number;
    scale: number;
    isMobile: boolean;
}

/**
 * 断点配置
 */
const BREAKPOINTS = {
    mobile: 768,
    tablet: 1024,
} as const;

/**
 * 响应式画布 Hook
 * 
 * 功能:
 * - 监听 window.resize 事件
 * - 根据 viewport 计算缩放比例
 * - 移动端全宽，保持 4:3 比例
 */
export function useResponsiveCanvas() {
    const [size, setSize] = useState<CanvasSize>(() => calculateSize());

    /**
     * 计算画布尺寸
     */
    function calculateSize(): CanvasSize {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const isMobile = vw < BREAKPOINTS.mobile;

        const baseWidth = CANVAS_CONFIG.width;
        const baseHeight = CANVAS_CONFIG.height;
        const aspectRatio = baseWidth / baseHeight;

        let width: number;
        let height: number;
        let scale: number;

        if (isMobile) {
            // 移动端：全宽，保持比例
            const padding = 16; // 左右各 16px
            width = vw - padding * 2;
            height = width / aspectRatio;
            scale = width / baseWidth;

            // 如果高度超过可用空间，按高度缩放
            const maxHeight = vh * 0.55; // 留出空间给 Header 和 ControlBar
            if (height > maxHeight) {
                height = maxHeight;
                width = height * aspectRatio;
                scale = width / baseWidth;
            }
        } else if (vw < BREAKPOINTS.tablet) {
            // 平板：留出侧边栏空间
            const availableWidth = vw * 0.65;
            const availableHeight = vh * 0.6;

            const scaleByWidth = availableWidth / baseWidth;
            const scaleByHeight = availableHeight / baseHeight;
            scale = Math.min(scaleByWidth, scaleByHeight);

            width = baseWidth * scale;
            height = baseHeight * scale;
        } else {
            // 桌面：固定最大尺寸
            const maxWidth = Math.min(baseWidth, vw * 0.6);
            const maxHeight = Math.min(baseHeight, vh * 0.65);

            const scaleByWidth = maxWidth / baseWidth;
            const scaleByHeight = maxHeight / baseHeight;
            scale = Math.min(scaleByWidth, scaleByHeight, 1);

            width = baseWidth * scale;
            height = baseHeight * scale;
        }

        return {
            width: Math.round(width),
            height: Math.round(height),
            scale,
            isMobile,
        };
    }

    /**
     * 处理窗口大小变化
     */
    const handleResize = useCallback(() => {
        // 使用 requestAnimationFrame 避免频繁重绘
        requestAnimationFrame(() => {
            setSize(calculateSize());
        });
    }, []);

    useEffect(() => {
        // 初始计算
        handleResize();

        // 监听 resize 事件（带防抖）
        let timeoutId: ReturnType<typeof setTimeout>;
        const debouncedResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(handleResize, 100);
        };

        window.addEventListener('resize', debouncedResize);

        // 监听屏幕方向变化
        window.addEventListener('orientationchange', handleResize);

        return () => {
            window.removeEventListener('resize', debouncedResize);
            window.removeEventListener('orientationchange', handleResize);
            clearTimeout(timeoutId);
        };
    }, [handleResize]);

    return size;
}

export type { CanvasSize };
