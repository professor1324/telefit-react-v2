import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Layout from "./layout";
import Index from "./pages/Index";
import Bmi from "./pages/Bmi";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import WorkoutPage from "./pages/WorkoutPage";
import CalorieCalculator from "./pages/CalorieCalculator";
import ProgressPage from "./pages/Progress";
import Settings  from "./pages/settings";

export default function App() {
  return (
    <>
      <Router>
        <Layout>
          <Switch>
            <Route exact path="/">
              <Index />
            </Route>

            <Route exact path="/bmi">
              <Bmi />
            </Route>

            <Route exact path="/register">
              <Register />
            </Route>

            <Route exact path="/login">
              <Login />
            </Route>

            <Route exact path="/dashboard">
              <ProtectedRoute component={Dashboard} />
            </Route>

            <Route exact path="/workout">
              <ProtectedRoute component={WorkoutPage} />
            </Route>

            <Route exact path="/progress">
              <ProtectedRoute component={ProgressPage} />
            </Route>

            <Route exact path="/settings">
              <ProtectedRoute component={Settings} />
            </Route>

            <Route exact path="/calories">
              <CalorieCalculator />
            </Route>

          </Switch>
        </Layout>
      </Router>
    </>
  );
}
