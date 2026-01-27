import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
    window.global = window;
    window.Buffer = Buffer;
}
