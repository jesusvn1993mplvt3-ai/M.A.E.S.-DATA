export const ROLES = { 
    ADMIN: 'admin', 
    COMMENTATOR: 'commentator', 
    OBSERVER: 'observer', 
    DEVELOPMENT: 'development',
    OPERATOR: 'operator'
};

export const DEFAULT_USERS = {
    '1111': { name: 'Marco Espinoza', role: ROLES.ADMIN, area: 'Administración', canManageOrders: true },
    '0000': { name: 'Prisciliano Espinoza', role: ROLES.COMMENTATOR, area: 'Comentarios' },
    '2222': { name: 'Susana', role: ROLES.OBSERVER, area: 'Observación', canManageOrders: true, canViewGraph: true }, 
    '1352': { name: 'Vallejo', role: ROLES.DEVELOPMENT, area: 'Desarrollo', canManageOrders: true, canViewGraph: true, canManageUsers: true }, 
    '3333': { name: 'Tejido', role: ROLES.OPERATOR, area: 'Operadores Gral' },
    '1392': { name: 'Andrés', role: ROLES.OPERATOR, area: 'Tejido (A)', allowedSlots: [0] },
    '7914': { name: 'Balta', role: ROLES.OPERATOR, area: 'Tejido (B)', allowedSlots: [1] }
};

export const MACHINES = [
    { id: 'm35', name: 'MAQ 35', type: 'SANTONI SM8' }, { id: 'm39', name: 'MAQ 39', type: 'SANTONI SM8' },
    { id: 'm40', name: 'MAQ 40', type: 'SANTONI SM8' }, { id: 'm36', name: 'MAQ 36', type: 'CIXING GE82' },
    { id: 'm38', name: 'MAQ 38', type: 'SANTONI SM8' }, { id: 'm37', name: 'MAQ 37', type: 'SANTONI SM8' },
    { id: 'm29', name: 'MAQ 29', type: 'SANTONI EVO4' }, { id: 'm28', name: 'MAQ 28', type: 'SANTONI EVO4' },
    { id: 'm27', name: 'MAQ 27', type: 'SANTONI EVO4' }, { id: 'm33', name: 'MAQ 33', type: 'SANTONI EVO4' },
    { id: 'm1',  name: 'MAQ 1',  type: 'CIXING' }, { id: 'm30', name: 'MAQ 30', type: 'CIXING GE82' },
    { id: 'm31', name: 'MAQ 31', type: 'CIXING GE82' }, { id: 'm6',  name: 'MAQ 6',  type: 'CIXING GE82' },
    { id: 'm32', name: 'MAQ 32', type: 'CIXING GE82' }, { id: 'm13', name: 'MAQ 13', type: 'SANTONI EVO4' },
    { id: 'm12', name: 'MAQ 12', type: 'SANTONI EVO4' }, { id: 'm24', name: 'MAQ 24', type: 'SANTONI EVO4' },
    { id: 'm8',  name: 'MAQ 8',  type: 'SANTONI TOP2' },
];
