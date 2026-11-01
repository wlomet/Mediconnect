import InactivityTable from "../../../components/InactivityTable";
import styles from "../dashboard/DashboardSuperAdmin.module.css";

const InactiviteSuperAdmin = () => (
  <div className={styles.container}>
    <div className={styles.header}>
      <h1>Comptes inactifs</h1>
    </div>

    <div className={styles.section}>
      <h2 style={{ margin: "0 0 15px 0" }}>Comptes et établissements inactifs à supprimer</h2>
      <InactivityTable endpoint="/super-admin/inactivity" />
    </div>
  </div>
);

export default InactiviteSuperAdmin;
