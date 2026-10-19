import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
test('Login post-V1 publica recuperación segura, conserva login y no revive OTP legado',async()=>{
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom'});
 try{const {default:Login}=await server.ssrLoadModule('/src/pages/LoginPage.jsx');const {AuthContext}=await server.ssrLoadModule('/src/context/useAuth.js');const html=renderToString(React.createElement(MemoryRouter,null,React.createElement(AuthContext.Provider,{value:{login(){}}},React.createElement(Login))));assert.match(html,/Iniciar sesión/);assert.match(html,/¿Olvidaste tu contraseña\?/);assert.doesNotMatch(html,/codigo_simulado|auth\/otp/i);
 }finally{await server.close();}
});
