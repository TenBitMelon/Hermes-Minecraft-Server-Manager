/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);

  const adminEmail = $os.getenv('POCKETBASE_INTERNAL_ADMIN_EMAIL');
  const adminPassword = $os.getenv('POCKETBASE_INTERNAL_ADMIN_PASSWORD');

  const admin = new Admin();
  admin.email = adminEmail;
  admin.setPassword(adminPassword);

  dao.saveAdmin(admin);
  console.log(`Created admin account with email ${adminEmail}, password ${adminPassword}`);
});
