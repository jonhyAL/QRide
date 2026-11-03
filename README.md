# Qride_IOT

## Descripción
QRide es una aplicación web progresiva (PWA) enfocada en la seguridad de motociclistas de la comunidad estudiantil. Cada usuario cuenta con un código QR que permite consultar rápidamente información médica crítica en caso de accidente, para facilitar una atención de emergencia oportuna.

La plataforma se integra con un dispositivo basado en Arduino instalado en la motocicleta. Este módulo transmite datos sobre la ubicación del vehículo, el estado del dispositivo y el comportamiento de manejo para su monitoreo en tiempo real. Así, QRide reúne información médica y datos del vehículo en una solución que busca reducir los tiempos de respuesta ante accidentes y fortalecer la seguridad vial dentro y alrededor de las instituciones educativas.

## Herramientas de desarrollo — Módulo IoT (Arduino)

| Herramienta / Tecnología | Tipo |
|---|---|
| Arduino IDE | Entorno de desarrollo (IDE) |
| Placa Arduino (Uno/Nano) | Microcontrolador |
| Módulo GPS NEO-6M | Sensor de geolocalización |
| Módulo GSM/SIM800L | Módulo de comunicación celular |
| Acelerómetro/Giroscopio MPU6050 | Sensor de movimiento |
| Sensor de temperatura (DS18B20 o similar) | Sensor ambiental |
| Módulo de memoria (microSD o EEPROM) | Almacenamiento local |
| TinyGPS++ | Librería Arduino |
| Adafruit MPU6050 | Librería Arduino |
| PubSubClient (MQTT) | Librería de comunicación |
| Protocolo MQTT | Protocolo de comunicación IoT |

## Herramientas y tecnologías — Aplicación web

| Herramienta / Tecnología | Tipo |
|---|---|
| React | Biblioteca de interfaz de usuario |
| HTML5 | Lenguaje de marcado |
| Tailwind CSS | Framework CSS |
| Framer Motion | Librería de animaciones |
| Supabase | Backend como servicio (BaaS) |
| PostgreSQL (Supabase Database) | Base de datos relacional |
| Supabase Authentication | Servicio de autenticación |
| JavaScript (ES6+) | Lenguaje de programación |
| QR Code Generator | Librería JavaScript |
| Visual Studio Code | Editor de código |
| Git | Sistema de control de versiones |
| GitHub | Plataforma de alojamiento de repositorios |
| Google Chrome | Navegador web |
| Chrome DevTools | Herramientas de depuración |
| npm (Node Package Manager) | Gestor de paquetes |
| Node.js | Entorno de ejecución de JavaScript |
| Regex (expresiones regulares) | Técnica de validación |
| Variables de entorno (`.env`) | Configuración del proyecto |

## Equipo de Trabajo
- SM Isail Iturbide Moreno
- DT1 Angel Gabriel Gonzalez Luna
- DT2 Jonny Alanis lopez Gael
- DT3 Esmeralda Jimenez Marcial
- DT4 Ricardo Camacho Valencia

## Funcionalidades de QRide

### Módulo de emergencia mediante QR

1. Registro de usuarios con información personal y médica.
2. Inicio de sesión seguro con acceso según el rol del usuario.
3. Generación de un código QR único para cada usuario.
4. Consulta de información médica crítica al escanear el QR.
5. Notificación automática a los contactos de emergencia.
6. Visualización del hospital o clínica de preferencia.
7. Registro y visualización de vehículos.
8. Chatbot básico de primeros auxilios.
9. Cierre automático de sesión tras 10 minutos de inactividad.

### Módulo IoT: Arduino, GPS y GSM

1. **Ubicación en tiempo real:** muestra la posición del vehículo en la aplicación.
2. **Geocerca:** genera una alerta si la motocicleta sale de una zona segura definida.
3. **Detección automática de caídas:** utiliza el acelerómetro MPU6050 para activar el protocolo de emergencia.
4. **Historial de rutas:** registra los trayectos recorridos.
5. **Alerta de velocidad excesiva:** notifica cuando se supera el límite configurado.
6. **Respaldo sin señal:** guarda temporalmente los datos del trayecto y los sincroniza al recuperar la conexión.

### Fechas
1. **FECHA DE INICIO:** 21 de septiembre 2026
2. **FECHA DE TERMINO:** 11 Diciembre 2026
