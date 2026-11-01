


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."persist_device_evidence_atomic"("p_physical_device_id" bigint, "p_provider" "text", "p_brand" "text", "p_model" "text", "p_tac" "text", "p_specifications" "jsonb", "p_blacklist_status" "text", "p_carrier_lock" boolean, "p_payload_hash" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $_$
DECLARE
  v_observed_at timestamptz := now();
  v_device_id bigint;
  v_variant_id bigint;
  v_blacklist_status text;
BEGIN
  IF p_provider IS NULL OR btrim(p_provider) = ''
     OR p_brand IS NULL OR btrim(p_brand) = ''
     OR p_model IS NULL OR btrim(p_model) = '' THEN
    RAISE EXCEPTION 'Invalid device evidence input';
  END IF;

  IF p_payload_hash IS NULL
     OR p_payload_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid payload hash';
  END IF;

  v_blacklist_status := upper(p_blacklist_status);

  IF v_blacklist_status NOT IN ('CLEAN', 'BLACKLISTED') THEN
    v_blacklist_status := NULL;
  END IF;

  SELECT pd.device_id, pd.variant_id
    INTO v_device_id, v_variant_id
  FROM public.physical_devices AS pd
  WHERE pd.id = p_physical_device_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Physical device not found';
  END IF;

  INSERT INTO public.device_evidence (
    physical_device_id,
    evidence_type,
    result,
    source_type,
    source_name,
    confidence,
    observed_at,
    metadata
  )
  VALUES (
    p_physical_device_id,
    'device_identification',
    'identified',
    'external_provider',
    p_provider,
    NULL,
    v_observed_at,
    jsonb_build_object(
      'brand', p_brand,
      'model', p_model,
      'tac', p_tac,
      'specifications', p_specifications
    )
  );

  IF v_blacklist_status IS NOT NULL THEN
    INSERT INTO public.device_evidence (
      physical_device_id,
      evidence_type,
      result,
      source_type,
      source_name,
      confidence,
      observed_at,
      metadata
    )
    VALUES (
      p_physical_device_id,
      'blacklist_status',
      lower(v_blacklist_status),
      'external_provider',
      p_provider,
      NULL,
      v_observed_at,
      '{}'::jsonb
    );
  END IF;

  IF p_carrier_lock IS NOT NULL THEN
    INSERT INTO public.device_evidence (
      physical_device_id,
      evidence_type,
      result,
      source_type,
      source_name,
      confidence,
      observed_at,
      metadata
    )
    VALUES (
      p_physical_device_id,
      'carrier_lock',
      CASE WHEN p_carrier_lock THEN 'locked' ELSE 'unlocked' END,
      'external_provider',
      p_provider,
      NULL,
      v_observed_at,
      '{}'::jsonb
    );
  END IF;

  IF v_device_id IS NOT NULL OR v_variant_id IS NOT NULL THEN
    INSERT INTO public.device_data_sources (
      device_id,
      variant_id,
      source_name,
      retrieved_at,
      payload_hash,
      metadata
    )
    VALUES (
      v_device_id,
      v_variant_id,
      p_provider,
      v_observed_at,
      p_payload_hash,
      jsonb_build_object(
        'record_type', 'imei_identification',
        'model', p_model,
        'verification_status',
          CASE
            WHEN v_blacklist_status IS NOT NULL
              OR p_carrier_lock IS NOT NULL THEN 'partial'
            ELSE 'identification_only'
          END
      )
    );
  END IF;
END;
$_$;


ALTER FUNCTION "public"."persist_device_evidence_atomic"("p_physical_device_id" bigint, "p_provider" "text", "p_brand" "text", "p_model" "text", "p_tac" "text", "p_specifications" "jsonb", "p_blacklist_status" "text", "p_carrier_lock" boolean, "p_payload_hash" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_physical_device"("p_device_id" bigint, "p_variant_id" bigint, "p_identifier_type" "text", "p_identifier_hash" "text", "p_last_four" "text") RETURNS bigint
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $_$
DECLARE
  v_physical_device_id bigint;
  v_new_physical_device_id bigint;
  v_variant_device_id bigint;
BEGIN
  -- Validate the identifier.
  IF p_identifier_type IS NULL
     OR p_identifier_type NOT IN ('imei', 'serial', 'meid') THEN
    RAISE EXCEPTION 'Unsupported identifier type';
  END IF;

  IF p_identifier_hash IS NULL
     OR p_identifier_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Identifier hash must be a SHA-256 HMAC hex digest';
  END IF;

  IF p_last_four IS NOT NULL
     AND p_last_four !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'last_four must contain exactly four digits';
  END IF;

  -- Validate the variant and derive its catalogue device.
  IF p_variant_id IS NOT NULL THEN
    SELECT dv.device_id
      INTO v_variant_device_id
    FROM public.device_variants AS dv
    WHERE dv.id = p_variant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Device variant not found';
    END IF;

    IF p_device_id IS NOT NULL
       AND p_device_id <> v_variant_device_id THEN
      RAISE EXCEPTION 'Device and variant do not match';
    END IF;

    p_device_id := v_variant_device_id;
  END IF;

  -- Reuse an existing identifier if it is already registered.
  SELECT pdi.physical_device_id
    INTO v_physical_device_id
  FROM public.physical_device_identifiers AS pdi
  WHERE pdi.identifier_type = p_identifier_type
    AND pdi.identifier_hash = p_identifier_hash;

  IF FOUND THEN
    UPDATE public.physical_devices AS pd
    SET last_seen_at = now(),
        updated_at = now(),
        device_id = COALESCE(pd.device_id, p_device_id),
        variant_id = COALESCE(pd.variant_id, p_variant_id)
    WHERE pd.id = v_physical_device_id
      AND (
        pd.device_id IS NULL
        OR p_device_id IS NULL
        OR pd.device_id = p_device_id
      )
      AND (
        pd.variant_id IS NULL
        OR p_variant_id IS NULL
        OR pd.variant_id = p_variant_id
      );

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Identifier is already linked to a conflicting catalogue device';
    END IF;

    RETURN v_physical_device_id;
  END IF;

  -- Create a candidate physical-device record.
  INSERT INTO public.physical_devices (
    device_id,
    variant_id,
    status
  )
  VALUES (
    p_device_id,
    p_variant_id,
    CASE
      WHEN p_device_id IS NULL THEN 'unverified'
      ELSE 'identified'
    END
  )
  RETURNING id INTO v_new_physical_device_id;

  -- If another request registered the same identifier concurrently,
  -- the unique constraint prevents a duplicate identifier.
  INSERT INTO public.physical_device_identifiers (
    physical_device_id,
    identifier_type,
    identifier_hash,
    last_four
  )
  VALUES (
    v_new_physical_device_id,
    p_identifier_type,
    p_identifier_hash,
    p_last_four
  )
  ON CONFLICT (identifier_type, identifier_hash) DO NOTHING
  RETURNING physical_device_id INTO v_physical_device_id;

  IF v_physical_device_id IS NOT NULL THEN
    RETURN v_physical_device_id;
  END IF;

  -- Another request won the race. Remove our unused candidate.
  DELETE FROM public.physical_devices
  WHERE id = v_new_physical_device_id;

  SELECT pdi.physical_device_id
    INTO v_physical_device_id
  FROM public.physical_device_identifiers AS pdi
  WHERE pdi.identifier_type = p_identifier_type
    AND pdi.identifier_hash = p_identifier_hash;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Could not resolve concurrent device registration';
  END IF;

  -- Reuse the winning record without overwriting conflicting identity data.
  UPDATE public.physical_devices AS pd
  SET last_seen_at = now(),
      updated_at = now(),
      device_id = COALESCE(pd.device_id, p_device_id),
      variant_id = COALESCE(pd.variant_id, p_variant_id)
  WHERE pd.id = v_physical_device_id
    AND (
      pd.device_id IS NULL
      OR p_device_id IS NULL
      OR pd.device_id = p_device_id
    )
    AND (
      pd.variant_id IS NULL
      OR p_variant_id IS NULL
      OR pd.variant_id = p_variant_id
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Identifier is already linked to a conflicting catalogue device';
  END IF;

  RETURN v_physical_device_id;
END;
$_$;


ALTER FUNCTION "public"."register_physical_device"("p_device_id" bigint, "p_variant_id" bigint, "p_identifier_type" "text", "p_identifier_hash" "text", "p_last_four" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_physical_device_with_evidence"("p_device_id" bigint, "p_variant_id" bigint, "p_identifier_type" "text", "p_identifier_hash" "text", "p_last_four" "text", "p_provider" "text", "p_brand" "text", "p_model" "text", "p_tac" "text", "p_specifications" "jsonb", "p_blacklist_status" "text", "p_carrier_lock" boolean, "p_payload_hash" "text") RETURNS bigint
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
    v_physical_device_id bigint;
BEGIN
    -- Register or reuse the physical device.
    v_physical_device_id :=
        public.register_physical_device(
            p_device_id,
            p_variant_id,
            p_identifier_type,
            p_identifier_hash,
            p_last_four
        );

    -- Persist its evidence in the same database transaction.
    PERFORM public.persist_device_evidence_atomic(
        v_physical_device_id,
        p_provider,
        p_brand,
        p_model,
        p_tac,
        p_specifications,
        p_blacklist_status,
        p_carrier_lock,
        p_payload_hash
    );

    RETURN v_physical_device_id;
END;
$$;


ALTER FUNCTION "public"."register_physical_device_with_evidence"("p_device_id" bigint, "p_variant_id" bigint, "p_identifier_type" "text", "p_identifier_hash" "text", "p_last_four" "text", "p_provider" "text", "p_brand" "text", "p_model" "text", "p_tac" "text", "p_specifications" "jsonb", "p_blacklist_status" "text", "p_carrier_lock" boolean, "p_payload_hash" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."banners" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text",
    "subtitle" "text",
    "image" "text",
    "button_text" "text",
    "button_link" "text",
    "active" boolean DEFAULT true,
    "display_order" bigint DEFAULT '0'::bigint
);


ALTER TABLE "public"."banners" OWNER TO "postgres";


ALTER TABLE "public"."banners" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."banners_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "display_order" bigint DEFAULT '0'::bigint,
    "featured" boolean DEFAULT true,
    "image" "text",
    "slug" "text",
    "title" "text"
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


ALTER TABLE "public"."categories" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."categories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."device_data_sources" (
    "id" bigint NOT NULL,
    "device_id" bigint,
    "variant_id" bigint,
    "source_name" "text" NOT NULL,
    "source_record_id" "text",
    "retrieved_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payload_hash" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "device_data_sources_check" CHECK ((("device_id" IS NOT NULL) OR ("variant_id" IS NOT NULL)))
);


ALTER TABLE "public"."device_data_sources" OWNER TO "postgres";


ALTER TABLE "public"."device_data_sources" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."device_data_sources_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."device_evidence" (
    "id" bigint NOT NULL,
    "physical_device_id" bigint NOT NULL,
    "evidence_type" "text" NOT NULL,
    "result" "text" NOT NULL,
    "source_type" "text" NOT NULL,
    "source_name" "text",
    "confidence" numeric(5,4),
    "observed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "device_evidence_confidence_check" CHECK ((("confidence" IS NULL) OR (("confidence" >= (0)::numeric) AND ("confidence" <= (1)::numeric)))),
    CONSTRAINT "device_evidence_source_type_check" CHECK (("source_type" = ANY (ARRAY['external_provider'::"text", 'diagnostic'::"text", 'seller'::"text", 'repairer'::"text", 'marketplace'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."device_evidence" OWNER TO "postgres";


ALTER TABLE "public"."device_evidence" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."device_evidence_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."device_identifiers" (
    "id" bigint NOT NULL,
    "device_id" bigint NOT NULL,
    "identifier_type" "text" NOT NULL,
    "identifier_value" "text" NOT NULL,
    "source" "text",
    "confidence" numeric(5,4),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."device_identifiers" OWNER TO "postgres";


ALTER TABLE "public"."device_identifiers" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."device_identifiers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."device_variants" (
    "id" bigint NOT NULL,
    "device_id" bigint NOT NULL,
    "model_number" "text" NOT NULL,
    "region" "text",
    "storage" "text",
    "connectivity" "text",
    "specifications" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."device_variants" OWNER TO "postgres";


ALTER TABLE "public"."device_variants" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."device_variants_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."device_verifications" (
    "id" bigint NOT NULL,
    "device_id" bigint,
    "verification_type" "text" NOT NULL,
    "result" "text" NOT NULL,
    "confidence" numeric(5,4),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."device_verifications" OWNER TO "postgres";


ALTER TABLE "public"."device_verifications" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."device_verifications_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."devices" (
    "id" bigint NOT NULL,
    "brand" "text" NOT NULL,
    "model" "text" NOT NULL,
    "model_number" "text",
    "category" "text" NOT NULL,
    "release_year" integer,
    "specifications" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."devices" OWNER TO "postgres";


ALTER TABLE "public"."devices" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."devices_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."faq" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "question" "text",
    "answer" "text",
    "display_order" bigint DEFAULT '0'::bigint,
    "active" boolean DEFAULT true
);


ALTER TABLE "public"."faq" OWNER TO "postgres";


ALTER TABLE "public"."faq" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."faq_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "order_id" bigint,
    "product_variant_id" bigint,
    "quantity" bigint DEFAULT '1'::bigint,
    "unit_price" numeric DEFAULT '0'::numeric,
    "subtotal" numeric DEFAULT '0'::numeric
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


ALTER TABLE "public"."order_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."order_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" bigint,
    "order_number" "text",
    "total_amount" numeric DEFAULT '0'::numeric,
    "payment_status" "text" DEFAULT '''pending'''::"text",
    "order_status" "text" DEFAULT '''processing'''::"text",
    "delivery_address" "text",
    "payment_method" "text",
    "updated_at" timestamp with time zone,
    "seller_id" bigint,
    "payment_reference" "text",
    "tracking_number" "text"
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


ALTER TABLE "public"."orders" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."orders_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."physical_device_identifiers" (
    "id" bigint NOT NULL,
    "physical_device_id" bigint NOT NULL,
    "identifier_type" "text" NOT NULL,
    "identifier_hash" "text" NOT NULL,
    "last_four" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "physical_device_identifiers_identifier_type_check" CHECK (("identifier_type" = ANY (ARRAY['imei'::"text", 'serial'::"text", 'meid'::"text"])))
);


ALTER TABLE "public"."physical_device_identifiers" OWNER TO "postgres";


ALTER TABLE "public"."physical_device_identifiers" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."physical_device_identifiers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."physical_devices" (
    "id" bigint NOT NULL,
    "device_id" bigint,
    "variant_id" bigint,
    "status" "text" DEFAULT 'unverified'::"text" NOT NULL,
    "first_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "physical_devices_status_check" CHECK (("status" = ANY (ARRAY['unverified'::"text", 'identified'::"text", 'under_review'::"text", 'verified'::"text", 'retired'::"text"])))
);


ALTER TABLE "public"."physical_devices" OWNER TO "postgres";


ALTER TABLE "public"."physical_devices" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."physical_devices_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."product_variants" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "product_id" bigint,
    "storage" "text",
    "colour" "text",
    "battery_health" bigint,
    "price" numeric,
    "stock" bigint DEFAULT '0'::bigint,
    "image" "text",
    "condition" "text",
    "inspection_score" bigint,
    "is_default" boolean DEFAULT false,
    "colour_hex" "text",
    "sku" "text"
);


ALTER TABLE "public"."product_variants" OWNER TO "postgres";


ALTER TABLE "public"."product_variants" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."product_variants_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" bigint NOT NULL,
    "title" "text",
    "slug" "text",
    "brand" "text",
    "verified" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "ram" "text",
    "processor" "text",
    "screen_size" "text",
    "operating_system" "text",
    "warranty_months" bigint,
    "gallery" "jsonb",
    "imei_checked" boolean,
    "seller_id" bigint,
    "featured" boolean,
    "status" "text" DEFAULT 'active'::"text",
    "updated_at" timestamp without time zone,
    "category_id" bigint,
    "rating" numeric DEFAULT 0,
    "review_count" bigint DEFAULT 0,
    "original_price" numeric,
    "description" "text"
);


ALTER TABLE "public"."products" OWNER TO "postgres";


ALTER TABLE "public"."products" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."products_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" bigint,
    "product_id" bigint,
    "rating" numeric(2,1) DEFAULT '5'::bigint,
    "comment" "text",
    "approved" boolean DEFAULT true,
    "updated_at" timestamp with time zone,
    "title" "text"
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


ALTER TABLE "public"."reviews" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."reviews_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "full_name" "text",
    "email" "text",
    "phone" "text",
    "role" "text",
    "verified" boolean,
    "avatar" "text",
    "status" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE "public"."users" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."users/sellers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."wishlist" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" bigint,
    "product_id" bigint
);


ALTER TABLE "public"."wishlist" OWNER TO "postgres";


ALTER TABLE "public"."wishlist" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."wishlist_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."banners"
    ADD CONSTRAINT "banners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_data_sources"
    ADD CONSTRAINT "device_data_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_evidence"
    ADD CONSTRAINT "device_evidence_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_identifiers"
    ADD CONSTRAINT "device_identifiers_identifier_type_identifier_value_key" UNIQUE ("identifier_type", "identifier_value");



ALTER TABLE ONLY "public"."device_identifiers"
    ADD CONSTRAINT "device_identifiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_variants"
    ADD CONSTRAINT "device_variants_model_number_key" UNIQUE ("model_number");



ALTER TABLE ONLY "public"."device_variants"
    ADD CONSTRAINT "device_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_verifications"
    ADD CONSTRAINT "device_verifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."faq"
    ADD CONSTRAINT "faq_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."physical_device_identifiers"
    ADD CONSTRAINT "physical_device_identifiers_identifier_type_identifier_hash_key" UNIQUE ("identifier_type", "identifier_hash");



ALTER TABLE ONLY "public"."physical_device_identifiers"
    ADD CONSTRAINT "physical_device_identifiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."physical_devices"
    ADD CONSTRAINT "physical_devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_user_product_unique" UNIQUE ("user_id", "product_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users/sellers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wishlist"
    ADD CONSTRAINT "wishlist_pkey" PRIMARY KEY ("id");



CREATE INDEX "device_data_sources_device_idx" ON "public"."device_data_sources" USING "btree" ("device_id");



CREATE INDEX "device_data_sources_variant_idx" ON "public"."device_data_sources" USING "btree" ("variant_id");



CREATE INDEX "device_evidence_device_idx" ON "public"."device_evidence" USING "btree" ("physical_device_id", "observed_at" DESC);



CREATE INDEX "device_evidence_type_idx" ON "public"."device_evidence" USING "btree" ("evidence_type");



CREATE INDEX "device_identifiers_device_id_idx" ON "public"."device_identifiers" USING "btree" ("device_id");



CREATE INDEX "device_identifiers_lookup_idx" ON "public"."device_identifiers" USING "btree" ("identifier_type", "identifier_value");



CREATE INDEX "device_variants_device_id_idx" ON "public"."device_variants" USING "btree" ("device_id");



CREATE INDEX "device_variants_model_number_idx" ON "public"."device_variants" USING "btree" ("model_number");



CREATE INDEX "physical_device_identifiers_device_idx" ON "public"."physical_device_identifiers" USING "btree" ("physical_device_id");



CREATE INDEX "physical_devices_device_id_idx" ON "public"."physical_devices" USING "btree" ("device_id");



CREATE INDEX "physical_devices_variant_id_idx" ON "public"."physical_devices" USING "btree" ("variant_id");



ALTER TABLE ONLY "public"."device_data_sources"
    ADD CONSTRAINT "device_data_sources_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_data_sources"
    ADD CONSTRAINT "device_data_sources_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."device_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_evidence"
    ADD CONSTRAINT "device_evidence_physical_device_id_fkey" FOREIGN KEY ("physical_device_id") REFERENCES "public"."physical_devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_identifiers"
    ADD CONSTRAINT "device_identifiers_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_variants"
    ADD CONSTRAINT "device_variants_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_verifications"
    ADD CONSTRAINT "device_verifications_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."physical_device_identifiers"
    ADD CONSTRAINT "physical_device_identifiers_physical_device_id_fkey" FOREIGN KEY ("physical_device_id") REFERENCES "public"."physical_devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."physical_devices"
    ADD CONSTRAINT "physical_devices_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physical_devices"
    ADD CONSTRAINT "physical_devices_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."device_variants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."wishlist"
    ADD CONSTRAINT "wishlist_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlist"
    ADD CONSTRAINT "wishlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Public can read product variants" ON "public"."product_variants" FOR SELECT USING (true);



CREATE POLICY "Public can read products" ON "public"."products" FOR SELECT USING (true);



ALTER TABLE "public"."banners" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_data_sources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_evidence" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_identifiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_verifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."devices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."faq" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."physical_device_identifiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."physical_devices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wishlist" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."persist_device_evidence_atomic"("p_physical_device_id" bigint, "p_provider" "text", "p_brand" "text", "p_model" "text", "p_tac" "text", "p_specifications" "jsonb", "p_blacklist_status" "text", "p_carrier_lock" boolean, "p_payload_hash" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."persist_device_evidence_atomic"("p_physical_device_id" bigint, "p_provider" "text", "p_brand" "text", "p_model" "text", "p_tac" "text", "p_specifications" "jsonb", "p_blacklist_status" "text", "p_carrier_lock" boolean, "p_payload_hash" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."register_physical_device"("p_device_id" bigint, "p_variant_id" bigint, "p_identifier_type" "text", "p_identifier_hash" "text", "p_last_four" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_physical_device"("p_device_id" bigint, "p_variant_id" bigint, "p_identifier_type" "text", "p_identifier_hash" "text", "p_last_four" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."register_physical_device_with_evidence"("p_device_id" bigint, "p_variant_id" bigint, "p_identifier_type" "text", "p_identifier_hash" "text", "p_last_four" "text", "p_provider" "text", "p_brand" "text", "p_model" "text", "p_tac" "text", "p_specifications" "jsonb", "p_blacklist_status" "text", "p_carrier_lock" boolean, "p_payload_hash" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_physical_device_with_evidence"("p_device_id" bigint, "p_variant_id" bigint, "p_identifier_type" "text", "p_identifier_hash" "text", "p_last_four" "text", "p_provider" "text", "p_brand" "text", "p_model" "text", "p_tac" "text", "p_specifications" "jsonb", "p_blacklist_status" "text", "p_carrier_lock" boolean, "p_payload_hash" "text") TO "service_role";



GRANT ALL ON TABLE "public"."banners" TO "anon";
GRANT ALL ON TABLE "public"."banners" TO "authenticated";
GRANT ALL ON TABLE "public"."banners" TO "service_role";



GRANT ALL ON SEQUENCE "public"."banners_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."banners_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."banners_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."device_data_sources" TO "service_role";



GRANT ALL ON SEQUENCE "public"."device_data_sources_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."device_data_sources_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."device_data_sources_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."device_evidence" TO "service_role";



GRANT ALL ON SEQUENCE "public"."device_evidence_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."device_evidence_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."device_evidence_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."device_identifiers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."device_identifiers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."device_identifiers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."device_identifiers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."device_variants" TO "service_role";



GRANT ALL ON SEQUENCE "public"."device_variants_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."device_variants_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."device_variants_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."device_verifications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."device_verifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."device_verifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."device_verifications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."devices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."devices_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."devices_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."devices_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."faq" TO "anon";
GRANT ALL ON TABLE "public"."faq" TO "authenticated";
GRANT ALL ON TABLE "public"."faq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."faq_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."faq_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."faq_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."order_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."order_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."order_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."orders_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."orders_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."orders_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."physical_device_identifiers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."physical_device_identifiers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."physical_device_identifiers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."physical_device_identifiers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."physical_devices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."physical_devices_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."physical_devices_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."physical_devices_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."product_variants" TO "anon";
GRANT ALL ON TABLE "public"."product_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."product_variants" TO "service_role";



GRANT ALL ON SEQUENCE "public"."product_variants_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."product_variants_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."product_variants_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON SEQUENCE "public"."reviews_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."reviews_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."reviews_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON SEQUENCE "public"."users/sellers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."users/sellers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."users/sellers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."wishlist" TO "anon";
GRANT ALL ON TABLE "public"."wishlist" TO "authenticated";
GRANT ALL ON TABLE "public"."wishlist" TO "service_role";



GRANT ALL ON SEQUENCE "public"."wishlist_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."wishlist_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."wishlist_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







