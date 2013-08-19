require('./common');
var odgn = require('../index')();


var components = [
    {
        "id":"/component/es_a",
        "properties":{
            "name":{"type":"string"}
        }
    },
    {
        "id":"/component/es_b",
        "properties":{
            "is_active":{ "type":"boolean" }
        }
    },
    {
        "id":"/component/es_c",
        "properties":{
            "age":{ "type":"integer" }
        }
    }
];

var entityTemplate = {
    "id":"/entity_template/a",
    "type":"object",
    "properties":{
        "a":{ "$ref":"/component/es_a" },
        "c":{ "$ref":"/component/es_c" },
    }
};


var createEntityAndEntitySet = function(options, callback){
    var registry = options.registry, entity, entitySet;
    async.waterfall([
        function createEntitySet(cb){
            // create an entity set for all entities
            registry.createEntitySet( null, {}, cb );
        },
        function createEntity(result, cb){
            entitySet = result;
            registry.createEntity(cb);
        }
    ], function(err,result){
        entity = result;
        return callback(err,entity,entitySet);
    });
};



describe('EntitySet', function(){
    beforeEach( function(done){
        var self = this;
        async.waterfall([
            function createRegistry(cb){
                odgn.entity.Registry.create({initialise:true}, cb);
            },
            function registerComponents(registry,cb){
                self.registry = registry;
                self.registry.registerComponent( components, cb ); 
            },
            function registerEntityTemplate(components, cb){
                self.registry.registerEntityTemplate( entityTemplate, cb );
            }
        ], function(err){
            if( err ) throw err;
            return done();
        });
    });


    it('should populate with existing components', function(done){
        var self = this;
        var entityId;
        async.waterfall([
            function(cb){
                self.registry.createEntity(cb);
            },
            function(entity,cb){
                entity.addComponent('/component/es_a', cb);
            },
            function(entity,component,cb){
                entityId = entity.id;
                // create an entityset interested in a single component
                self.registry.createEntitySet( '/component/es_a', {}, cb );
            }
        ], function(err,entitySet){
            assert.equal( entitySet.length, 1 );
            assert.equal( entitySet.at(0).id, entityId );
            done(); 
        });
    });

    it('should keep updated with existing components', function(done){
        var self = this;
        var entitySet, entityId;
        async.waterfall([
            function(cb){
                self.registry.createEntitySet( '/component/es_a', {}, cb );
            },
            function(result,cb){
                entitySet = result;
                assert.equal( entitySet.length, 0 );
                self.registry.createEntity(cb);
            },
            function(entity,cb){
                entityId = entity.id;
                entity.addComponent('/component/es_a', cb);
            }
        ], function(err){
            assert.equal( entitySet.length, 1 );
            assert.equal( entitySet.at(0).id, entityId );
            done();
        });
    });

    it('should return a component for an entity', function(done){
        var self = this, entitySet, entityId;
        async.waterfall([
            function(cb){
                createEntityAndEntitySet({registry:self.registry}, cb);
            },
            function addComponentToEntity( pEntity, pEntitySet, cb ){
                entity = pEntity; entitySet = pEntitySet;
                entityId = entity.id;
                entity.addComponent('/component/es_c', cb);
            },
        ], function retrieveComponentFromEntity(err,component){
            var component = entitySet.getComponent( "/component/es_c", entityId );
            assert.equal( component.schemaId, '/component/es_c' );
            done();
        });
    });

    it.only('should handle removed components correctly', function(done){
        var self = this, entitySet, entity, entityId;
        async.waterfall([
            function(cb){
                createEntityAndEntitySet({registry:self.registry}, cb);
            },
            function addComponentToEntity( pEntity, pEntitySet, cb ){
                entity = pEntity; entitySet = pEntitySet;
                entityId = entity.id;
                entity.addComponent('/component/es_c', cb);
            },
            function removeComponentFromEntity( pComponent, pEntity, cb ){
                var component = entitySet.getComponent( "/component/es_c", entityId );
                assert.equal( component.schemaId, '/component/es_c' );
                entity.removeComponent('/component/es_c', cb );
            },
        ], function retrieveComponentFromEntity(err,component){
            assert( !entitySet.getComponent( "/component/es_c", entityId ) );
            done();
        });
    });

    // describe('ordering of components within an entityset');
});