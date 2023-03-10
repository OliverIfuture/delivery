DROP TABLE IF EXISTS roles CASCADE;

create table roles(
	id BIGSERIAL PRIMARY KEY,
	name VARCHAR(255) NOT NULL UNIQUE,
	image VARCHAR(255)  NULL,
	route VARCHAR(255) NULL,
	created_at TIMESTAMP NOT NULL,
	updated_at timestamp(0)not null

);

DROP TABLE IF EXISTS users CASCADE;
create table users(
	id BIGSERIAL PRIMARY KEY,
	email VARCHAR(255) not null unique,
	name varchar(120) not null,
	lastname varchar(255)not null,
	phone varchar (255) not null unique,
	image varchar(255) null,
	notification_token VARCHAR(255) null,
	password varchar(255)not null,
	is_available boolean null,
	session_token varchar (255),
	create_at timestamp(0)not null,
	updated_at timestamp(0)not null
	);

	INSERT INTO roles (
		name,
		route,
		created_at,
		updated_at
	)

	values (
		'CLIENTE',
		'client/products/list',
		'2023-01-29',
		'2023-01-29'
	);

	INSERT INTO roles (
		name,
		route,
		created_at,
		updated_at
	)

	values (
		'RESTAURANTE',
		'restaurant/orders/list',
		'2023-01-29',
		'2023-01-29'
	);

	INSERT INTO roles (
		name,
		route,
		created_at,
		updated_at
	)

	values (
		'REPARTIDOR',
		'delivery/orders/list',
		'2023-01-29',
		'2023-01-29'
	);

DROP TABLE IF EXISTS user_has_role CASCADE;
create table user_has_role(
	id_user BIGSERIAL NOT NULL ,
	id_rol BIGSERIAL NOT NULL,
	created_at TIMESTAMP NOT NULL,
	updated_at timestamp(0)not null,
	FOREIGN KEY (id_user) REFERENCES users (id) on update cascade on delete cascade;
	FOREIGN KEY (id_rol) REFERENCES roles (id) on update cascade on delete cascade;
	PRIMARY key (id_user,id_rol)

DROP TABLE IF EXISTS categories CASCADE;
CREATE TABLE categories (
	id BIGSERIAL PRIMARY key,
	name VARCHAR(255) NOT NULL UNIQUE,
	description VARCHAR(255) NOT NULL,
	created_at TIMESTAMP(0) NOT NULL,
	updated_at TIMESTAMP(0) NOT NULL

);

DROP TABLE IF EXISTS products CASCADE;
CREATE TABLE products(
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(180) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL,
    price DECIMAL DEFAULT 0,
    image1 VARCHAR(255) NULL,
    image2 VARCHAR(255) NULL,
    image3 VARCHAR(255) NULL,
    id_category BIGINT NOT NULL,
    created_at TIMESTAMP(0) NOT NULL,
    updated_at TIMESTAMP(0) NOT NULL,
    FOREIGN KEY(id_category) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE CASCADE
);

DROP TABLE IF EXISTS address CASCADE;
CREATE TABLE address(
    id BIGSERIAL PRIMARY KEY,
	id_user BIGSERIAL NOT NULL,
	address VARCHAR(255) NOT NULL,
	neighborhood VARCHAR(255) NOT NULL,
	lat DECIMAL DEFAULT 0,
	lng DECIMAL DEFAULT 0,
	created_at TIMESTAMP(0) NOT NULL,
    updated_at TIMESTAMP(0) NOT NULL,
    FOREIGN KEY(id_user) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE



);

DROP TABLE IF EXISTS orders CASCADE;
CREATE TABLE orders(
    id BIGSERIAL PRIMARY KEY,
	id_client BIGINT NOT NULL,
	id_delivery BIGINT  NULL,
	id_address BIGINT NOT NULL,
	lat DECIMAL DEFAULT 0,
	lng DECIMAL DEFAULT 0,
	status VARCHAR(255) NOT NULL,
	TIMESTAMP BIGINT NOT NULL,
	created_at TIMESTAMP(0) NOT NULL,
    updated_at TIMESTAMP(0) NOT NULL,    
	FOREIGN KEY(id_client) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
	FOREIGN KEY(id_delivery) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
	FOREIGN KEY(id_address) REFERENCES address(id) ON UPDATE CASCADE ON DELETE CASCADE

);
DROP TABLE IF EXISTS order_has_products CASCADE;
CREATE TABLE order_has_products(
	id_order  BIGINT NOT NULL,
	id_product BIGINT NOT NULL,
	quantity BIGINT NOT NULL,
	created_at TIMESTAMP(0) NOT NULL,
    updated_at TIMESTAMP(0) NOT NULL, 
	PRIMARY KEY (id_order, id_product),
	FOREIGN KEY(id_order) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
	FOREIGN KEY(id_product) REFERENCES products(id) ON UPDATE CASCADE ON DELETE CASCADE

);


);