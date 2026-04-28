const { findByUser } = require('../models/addres');
const Address = require('../models/addres');

module.exports = {

    async findByUser(req, res, next) {
        try {
            const id_user = req.params.id_user;

            const data = await Address.findByUser(id_user);
            //    console.log(`Address: ${JSON.stringify(data)}`);

            return res.status(201).json(data);

        } catch (error) {

            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las direcciones',
                error: error,
                success: false


            });
        }
    },






    async delete(req, res, next) {
        try {

            const address = req.params;

            const data = await Address.delete(address.id, address.id_user);
            //console.log(`Address: ${JSON.stringify(data)}`);


            return res.status(201).json({

                success: true,
                message: 'La direccion se elimino correctamente',
            });


        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error eliminando la direccion',
                error: error
            });
        }
    },
    async create(req, res, next) {
        try {

            const address = req.body;
            const data = await Address.create(address);

            return res.status(201).json({

                success: true,
                message: 'La direccion se creo correctamente',
                data: data.id
            });


        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error creado la direccion',
                error: error
            });
        }
    },


    async findPromoByGym(req, res, next) {
        try {
            const id_company = req.params.id_company;

            const data = await Address.findPromoByGym(id_company);
            //    console.log(`findPromoByGym: ${JSON.stringify(data)}`);

            return res.status(201).json(data);

        } catch (error) {

            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las promos',
                error: error,
                success: false


            });
        }
    },


    async findByCompany(req, res, next) {
        try {
            const companyId = req.params.company_id;
            const data = await Address.findByCompany(companyId);

            return res.status(200).json({
                success: true,
                message: 'Ubicaciones obtenidas correctamente',
                data: data
            });
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener ubicaciones', error: error });
        }
    },

    async cobicreate(req, res, next) {
        try {
            const location = req.body;
            const data = await Address.cobicreate(location);

            return res.status(201).json({
                success: true,
                message: 'La ubicación se creó correctamente',
                data: data.id // Retornamos el ID recién creado
            });
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al registrar la ubicación', error: error });
        }
    },

    async setDefault(req, res, next) {
        try {
            const locationId = req.body.location_id;
            const companyId = req.body.company_id;

            await Address.setDefault(locationId, companyId);

            return res.status(200).json({
                success: true,
                message: 'Ubicación predeterminada actualizada'
            });
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al actualizar', error: error });
        }
    },

    async findByCompanyPref(req, res, next) {
        try {
            const companyId = req.params.id_company;
            const data = await Address.findByCompanyPref(companyId);

            return res.status(200).json({
                success: true,
                message: 'Preferencias obtenidas correctamente',
                data: data // Este Array es el que nuestro Provider de Flutter convertirá en Lista
            });
        } catch (error) {
            console.log(`Error en findByCompany prefs: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener preferencias de envío',
                error: error.message
            });
        }
    },

    async upsert(req, res, next) {
        try {
            const prefData = req.body;

            // Verificación básica
            if (!prefData.company_id || !prefData.location_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan IDs para guardar la preferencia'
                });
            }

            // Ejecutamos el modelo
            await Address.upsert(prefData);

            return res.status(200).json({
                success: true,
                message: 'Preferencias de envío guardadas con éxito'
            });
        } catch (error) {
            console.log(`Error al guardar prefs: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al guardar preferencias',
                error: error.message
            });
        }
    }

}
