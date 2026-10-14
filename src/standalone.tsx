import { configureBackend } from './api';
import { mountApp } from './mount';
configureBackend('browser');
mountApp();
